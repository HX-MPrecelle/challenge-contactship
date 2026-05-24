# ContactShip — Decisiones Técnicas

> Documento de defensa técnica para la presentación del challenge Lead Engineer.
> Cubre cada decisión de arquitectura, tecnología, tradeoff y qué haría diferente con más tiempo.

---

## 1. Cómo entendí el problema

El brief dice "gestionar contactos sin salir de la plataforma y que todo esté sincronizado con HubSpot". Leído así parece simple, pero hay tres problemas que la mayoría resuelve mal:

1. **¿Qué pasa si los dos lados modifican el mismo dato?** La mayoría lo ignora o hace last-write-wins sin que el usuario lo sepa.
2. **¿Cuándo se sincroniza?** Polling cada X minutos es degradado. La solución correcta es webhook-first con fallback de cron.
3. **¿Qué "valor de IA" es real y cuál es decorativo?** Un botón que llama a GPT no es valor. Valor es cuando la IA reemplaza trabajo que el usuario haría igual.

Partí de esos tres problemas para definir la arquitectura.

---

## 2. Decisión de arquitectura: monolito Next.js

**Lo que evalué:**
- Next.js monolito (App Router + Server Actions)
- API REST separada (NestJS) + frontend React
- BFF (Backend For Frontend) pattern

**Por qué elegí el monolito:**

En un desafío de 3 días, separar backend y frontend introduce overhead de CORS, autenticación duplicada, contratos de API y dos deploys. El criterio es: _¿agrega complejidad sin agregar valor visible?_ En este caso, sí.

Next.js 15 App Router resuelve el problema elegantemente: Server Components para data-fetching sin API, Server Actions para mutaciones tipadas, Client Components solo donde necesito interactividad. El resultado es menos código y menos superficie de bugs.

**El tradeoff asumido:** Un monolito no escala horizontalmente de la misma forma. Si esto fuera producción real con millones de contactos, extraería el sync engine a un servicio separado con queue (Inngest, BullMQ). Pero para el scope del challenge, el monolito es la decisión correcta.

**Lo que haría con más tiempo:** Separar el cron de sync en un worker independiente. El riesgo actual es que un sync largo ocupe tiempo de función serverless.

---

## 3. Decisión de base de datos: Supabase

**Lo que evalué:**
- Supabase (Postgres + pgvector + Realtime + Auth + Vault)
- PlanetScale (MySQL serverless)
- Neon (Postgres serverless)
- Firebase (NoSQL)

**Por qué Supabase:**

Necesitaba cuatro cosas que normalmente requieren cuatro servicios distintos:
1. Base de datos relacional con Row Level Security
2. Vector search para embeddings (RAG)
3. Websockets para actualizaciones en tiempo real
4. Almacenamiento seguro de tokens OAuth (Vault secrets)

Supabase las tiene todas. Usar cuatro proveedores separados habría triplicado la complejidad de configuración.

**Decisión específica — pgvector vs servicio externo (Pinecone, Weaviate):**

La búsqueda semántica corre en el mismo Postgres donde viven los contactos. Esto permite hacer JOINs entre vectores y datos estructurados en una sola query. Con un servicio externo, necesitaría dos queries, desduplicar IDs y hacer joins en memoria.

**Decisión de índice: IVFFlat vs HNSW:**
- IVFFlat: mejor throughput de escritura, más barato en memoria, adecuado para < 1M rows
- HNSW: mejor recall, más costoso en memoria, mejor para búsquedas frecuentes

Elegí IVFFlat con `lists = 100` (dimensionado para ~1M rows). Con el volumen actual (~500 contactos) no hay diferencia práctica.

---

## 4. Decisión de seguridad: RLS con app_metadata

Este es uno de los errores más comunes con Supabase y lo encontré en producción.

**El bug inicial:**
```sql
-- INSEGURO: user_metadata es editable por el usuario
using ((auth.jwt() -> 'user_metadata' ->> 'org_id')::uuid = org_id)
```

Un usuario autenticado puede llamar `supabase.auth.updateUser({ data: { org_id: 'otro-org-uuid' } })` y leer datos de otra organización. Descubierto vía el linter de seguridad de Supabase.

**El fix:**
```sql
-- SEGURO: app_metadata solo es editable por el service role
using ((auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid = org_id)
```

`app_metadata` solo puede ser modificado por el service role (servidor). El cliente nunca puede cambiarlo. El `org_id` se setea en `app_metadata` cuando se crea la organización vía el Server Action, nunca desde el cliente.

**Por qué esto importa para un Lead Engineer:** Es la diferencia entre un sistema que parece seguro y uno que es seguro. La mayoría de tutoriales de Supabase usan `user_metadata` para multi-tenancy. Está mal.

---

## 5. Sincronización HubSpot: webhook-first con fallback de cron

**El problema del sync bidireccional:**

HubSpot y ContactShip pueden modificar el mismo contacto en paralelo. Opciones:

- **Last-write-wins**: simple pero silencioso — el usuario no sabe que perdió datos
- **Pick one source of truth**: rompe el caso de uso (quieren editar en ambos lados)
- **Conflict detection + resolution**: complejo pero correcto

Elegí conflict detection.

**Evolución del sistema de conflictos:**

Empecé con un sistema de 2 vías: si ambos lados cambiaron en los últimos 5 minutos → conflicto. El problema: con realtime activo, la ventana de 5 minutos es arbitraria e incorrecta. Con sync instantáneo vía webhook, "los dos cambiaron algo" es demasiado broad.

Evolucioné a **3-way merge** con `base_state` como ancestro común:

```
BASE:    Leonardo | Pereyra | +54 11 1234    ← último estado acordado
LOCAL:   Leonardo Andrés | Pereyra | +54 11 1234  ← vos cambiaste nombre
HUBSPOT: Leonardo | Pereyra | +59 2342 48-4223    ← HS cambió teléfono

Resultado: auto-merge (campos distintos, sin solapamiento)
→ sync_status = 'synced', usuario no interviene
```

Solo si ambos lados cambian el **mismo campo** se genera un conflicto real, y el diff muestra el valor base como contexto.

**Verificación de firma del webhook:**
```typescript
const sourceString = method + fullUri + rawBody + timestamp;
const expected = HMAC-SHA256(clientSecret, sourceString);
```

HubSpot firma con v3 signature. Sin esto, cualquiera puede mandarte eventos falsos al endpoint.

**Un bug que encontré en producción:** el handler hacía `void processEvents()` y retornaba 200 antes de que el proceso terminara. En Vercel serverless, el runtime se congela cuando se envía la respuesta. Los contactos nunca se actualizaban en Supabase. Fix: usar `after()` de Next.js que garantiza ejecución post-response.

---

## 6. Realtime: Supabase Realtime + router.refresh()

**El problema:** Next.js App Router tiene Server Components — no reaccionan a cambios sin un re-render del servidor.

**Solución en dos capas:**

1. **Supabase Realtime (`postgres_changes`)**: para actualizaciones del cliente (lista de contactos, inbox del agente). Los cambios en la DB se propagan directamente al browser sin round-trip al servidor.

2. **`router.refresh()` + Realtime**: para el detalle del contacto. Como la página es un Server Component que necesita re-fetchear, el componente invisible `ContactRealtimeRefresher` llama `router.refresh()` cuando llega un evento para ese contacto.

**El tradeoff de `router.refresh()`:** re-renderiza todo el Server Component. Para una página con muchas queries en paralelo esto puede sentirse lento. Con más tiempo, extraería los campos editables a Client Components con estado local que se actualizan directamente desde el payload del evento.

**Bug de filtro en Realtime:** filtrar por `id=eq.${uuid}` en `postgres_changes` no funciona de forma confiable. El filtro por `org_id` sí funciona. Solución: suscribirse con filtro por `org_id` y filtrar por contact ID en el callback JavaScript.

---

## 7. Pipeline RAG y embeddings

**Por qué embeddings en Postgres y no en un servicio externo:**

Ya explicado en §3. La ventaja adicional: puedo hacer `ORDER BY embedding <=> query_embedding` con filtros SQL en la misma query:

```sql
SELECT id, name, company, lifecycle_stage, similarity
FROM match_contacts($1, $2, 0.35, 20)
WHERE sync_status != 'archived'
```

Con Pinecone tendría que: embedear → query Pinecone → obtener IDs → query Postgres con los IDs → merge. Más latencia, más código.

**Umbral de similitud por caso de uso:**
- Chat semántico: `0.35` (alta recall, prefiero falsos positivos)
- Contactos similares: `0.50` (balance)
- Detección de duplicados: `0.88` (alta precisión, prefiero falsos negativos)

**`text-embedding-3-small` vs `text-embedding-3-large`:**
- `small`: 1536 dims, $0.02/1M tokens
- `large`: 3072 dims, $0.13/1M tokens

Para un CRM de contactos el modelo small es más que suficiente. La calidad del texto input es más importante que el tamaño del modelo.

**Generación de embeddings con `after()`:**

Los embeddings se generan **después** de enviar la respuesta al usuario. El webhook, la edición de contacto y el sync de cron responden inmediatamente. El embedding corre en background. Si falla, el chat usa backfill lazy en el primer acceso.

---

## 8. Decisiones de IA: qué es valor real vs decorativo

**Por qué el chat con tool calling es valioso:**

No es "un chat que sabe de tus contactos". Es un asistente que tiene acceso a herramientas reales:
- `searchContacts`: SQL filters, ORDER BY, LIMIT
- `semanticSearch`: cosine similarity sobre embeddings
- `getStats`: GROUP BY aggregations
- `getContactDetails`: full contact con historial de sync

Cuando preguntás "¿cuáles son mis clientes más grandes en Argentina sin actividad?", el modelo llama a `searchContacts({lifecycleStage:"customer", country:"Argentina"})` + `getStats({groupBy:"lead_status"})`. No alucina datos.

**Agente Autónomo — por qué es diferente a un insight:**

La diferencia entre un insight y un agente es que el agente **propone acciones concretas y genera el artefacto** (borrador de email) que el usuario solo aprueba. El flujo es:
1. Cron diario escanea contactos en riesgo
2. Para cada uno, genera un borrador de email personalizado con contexto del contacto + insights de la IA
3. El usuario ve el borrador en la bandeja → "Aprobar" abre el cliente de email pre-cargado

La personalización viene de las notas del CRM + el análisis de insights. No es un template.

**Personalización por comportamiento:** si el usuario sistemáticamente descarta acciones de tipo `re_engagement` para leads `subscriber`, el agente deja de generarlas. Aprende las preferencias con 30 días de historial.

**Confidence score en insights:**

Los insights tienen un campo `confidence: "high" | "medium" | "low"` que el modelo asigna basándose en la completitud de datos. Un contacto con solo email y sin notas de CRM recibe `low`. Esto previene que el usuario confíe igual en un análisis bien fundamentado que en uno con datos mínimos.

**Por qué `gpt-4o-mini` y no `gpt-4o`:**

En producción, el costo es un factor real. Todos los casos de uso de este CRM son: análisis de texto corto, generación de emails, scoring numérico. `gpt-4o-mini` es 15x más barato con calidad equivalente para estas tareas. El modelo está centralizado en `lib/ai/config.ts` como `AI_MODEL_ID = process.env.OPENAI_MODEL ?? "gpt-4o-mini"` — switchear a `gpt-4o` es una variable de entorno.

---

## 9. Memoria cross-session en el chat

Los mensajes del usuario se embedean en background y se almacenan en `chat_messages.embedding`. Antes de cada respuesta, el sistema recupera los 4 mensajes más semánticamente similares de conversaciones pasadas.

**Por qué solo mensajes del usuario:**

Embedear respuestas del asistente duplicaría el costo sin agregar información. El usuario expresa la intención; la respuesta es derivada.

**Por qué `threshold = 0.6` (más alto que el chat):**

La memoria cross-session debe ser relevante y precisa. Un falso positivo (memoria irrelevante inyectada) contamina el contexto. Prefiero no inyectar memoria que inyectar ruido.

---

## 10. Multi-tenancy y seguridad de datos

Cada tabla tiene `org_id` en todas las rows. RLS en todas las tablas. Service role solo en el servidor.

**OAuth HubSpot — por qué los tokens van a Vault y no a columnas:**

Los tokens de acceso de HubSpot son credenciales de alto valor. Si alguien hace un SQL dump de la tabla `hubspot_connections`, los tokens en texto plano son inmediatamente explotables. Supabase Vault los cifra con AES-256 y solo los expone vía funciones del service role.

**Por qué no uso el Private App Token para webhooks:**

El Private App es específico de un portal. La app OAuth es multi-portal: un solo Client ID/Secret, múltiples portales instalados. Para un producto SaaS (muchos clientes con sus HubSpots), la app OAuth es el modelo correcto.

**Verificación de webhook en dos secretos:**

En el caso de este challenge, el webhook viene de un Private App (no del OAuth App). La firma usa el token del Private App, no el Client Secret del OAuth App. El handler intenta verificar con ambos:

```typescript
for (const secret of [HUBSPOT_CLIENT_SECRET, HUBSPOT_PRIVATE_APP_TOKEN]) {
  try { verifySignature(secret); verified = true; break; }
  catch { continue; }
}
```

En producción con muchos clientes, cada portal instalaría la misma app OAuth y la firma siempre sería con el Client Secret.

---

## 11. Paginación server-side

**El error inicial:**

```typescript
.limit(200)  // ← hardcodeado, silenciosamente mostraba 200 de 423 contactos
```

El dashboard mostraba 423 (count sin limit), la lista mostraba 200. El usuario reportó la discrepancia.

**La solución correcta:**

```typescript
const { data, count } = await supabase
  .from("contacts")
  .select("...", { count: "exact" })
  .eq("org_id", orgId)
  .order("local_updated_at", { ascending: false })
  .range(page * 10, (page + 1) * 10 - 1);  // range = from, to (inclusive)
```

Los filtros (status, lifecycle, text search) corren como `WHERE` en Postgres. El text search usa `ilike` con debounce de 350ms en el cliente.

**Por qué mantener el AI filter client-side:**

El AI filter parsea lenguaje natural a filtros estructurados y los aplica sobre los contactos cargados de la página actual. Esto es una limitación consciente: solo filtra dentro de la página. La alternativa correcta sería serializar los filtros parseados a URL params y enviarlos al servidor, pero para un MVP es un tradeoff aceptable.

---

## 12. CI/CD y testing

**GitHub Actions:** typecheck + lint + 18 unit tests en cada PR. Branch protection en `main` — no se puede pushear directamente, requiere PR con CI verde.

**Qué testeo y por qué:**

- `contact-filters.test.ts`: función pura `matchesFilter` — 8 casos covering eq, ilike, lt/gt, null, operador desconocido
- `insights-cache.test.ts`: lógica de freshness del cache (TTL, stale flag, rows faltantes) — sin I/O, pura lógica de decisión
- `conflict-merge.test.ts`: selección de campo en el merge (local vs hubspot wins) — la lógica más crítica del sistema

No testeo componentes React ni API routes. Para un challenge de 3 días, el ROI de tests de integración es bajo comparado con cubrir la lógica de negocio pura.

**Lo que agregaría con más tiempo:**
- Test E2E del flujo completo de onboarding → sync → conflicto
- Tests de snapshot para el diff del conflict
- Tests de carga para el cron de sync con 10k+ contactos

---

## 13. Deployment y operaciones

**Vercel (Hobby) — limitaciones y cómo las manejé:**

- Crons: máximo 1 por día (no cada hora). Fix: confío en webhooks para realtime, el cron es solo safety net
- maxDuration: 60s por función. El sync de cron procesa en batches de 100 por página, puede tardar si hay muchos contactos
- Sin Redis: usé `org_ai_cache` table para el cache de prioridades (reemplaza el `Map` en memoria que no sobrevive deploys)

**Variables de entorno — el bug de quotes:**

Al hacer `vercel env add` desde scripts bash en Windows, los valores se guardaban con comillas literales (`"https://..."` en lugar de `https://...`). El middleware de Supabase fallaba con "Invalid supabaseUrl". Fix: usar PowerShell con `printf '%s' "$value"` en lugar de echo.

**Vercel CLI no garantiza ejecución post-response:**

Documentado en §5. El `void promise` pattern funciona en Express (proceso largo) pero no en serverless (el proceso se congela al responder). `after()` de Next.js es la solución oficial para este patrón.

---

## 14. Decisiones que no tomé y por qué

**No usé Inngest (queue de background jobs):**

Inngest habría simplificado el sync engine: job por contacto, retry automático, observabilidad. Lo descarté para mantener el setup simple (sin cuenta externa, sin dependencia nueva). Con más tiempo, lo usaría.

**No usé Redis para cache:**

Sustituto: tabla `org_ai_cache` con TTL y upsert. Funciona perfectamente para el volumen actual. Redis agrega latencia baja pero en Vercel Edge/Node.js la latencia de Supabase ya es < 50ms.

**No usé streaming en el agente autónomo:**

El agente genera acciones secuencialmente (N llamadas a GPT). Para 10 contactos con 4-5s por llamada = 40-50s de espera. Workaround: insertar en DB inmediatamente después de generar cada acción → Supabase Realtime le manda el resultado al browser a medida que aparece. El usuario ve las acciones llegar una a una.

**No pagino el chat:**

Los mensajes del chat se cargan todos en memoria. Para conversaciones largas (1000+ mensajes) esto sería un problema. Con más tiempo implementaría lazy loading de historial.

---

## 15. Lo que haría diferente con 2 semanas

1. **Sync engine como worker separado**: Next.js no es el runtime ideal para procesos de larga duración. Extraer el sync a un worker con BullMQ o Inngest permite: retries granulares, dead-letter queue, observabilidad por evento.

2. **Agente con multi-step reasoning**: El agente actual genera una acción por contacto en una sola llamada a GPT. Un agente real haría: (1) análisis de contexto, (2) decisión de tipo de acción, (3) generación del contenido. Permite mayor calidad y explicabilidad.

3. **HubSpot como bilateral verdadero**: Hoy el sync es principalmente HubSpot → local con writes locales pushing back. Un sistema bilateral completo requiere un queue de operaciones pendientes para manejar rate limits, failures y ordering.

4. **Tests de integración del sync**: La lógica de conflictos 3-way es crítica y compleja. Merece tests de integración con un HubSpot sandbox real, no solo unit tests.

5. **Métricas de negocio en el agente**: ¿Cuántos emails generados por el agente resultaron en una respuesta? ¿La tasa de conversión mejoró? Sin esto, el agente es un feature sin ROI medible.

---

## 16. Tradeoffs explícitos

| Decisión | Lo que gané | Lo que sacrifiqué |
|---|---|---|
| Monolito Next.js | Velocidad de desarrollo, menos config | Escalabilidad de sync engine |
| pgvector vs Pinecone | Un solo servicio, JOINs directos | Búsqueda semántica más sofisticada |
| gpt-4o-mini | Costo 15x menor | Calidad de análisis en casos edge |
| after() para embeddings | Respuesta inmediata al usuario | Embeddings no disponibles hasta ~2s después |
| Supabase Realtime | Sin servidor WebSocket propio | Dependencia en un único proveedor |
| Server-side pagination | Escala a cualquier volumen | AI filter solo aplica sobre la página actual |
| app_metadata para org_id | Seguridad real en RLS | Requiere refresh de sesión post-bootstrap |
| base_state para 3-way merge | Auto-merge de cambios no solapados | Complejidad adicional en el schema |

---

## 17. Métricas de lo construido

| Métrica | Valor |
|---|---|
| Líneas de código | ~8.500 (excluyendo generados y node_modules) |
| Tests | 18 unit tests, 13 E2E specs |
| Migraciones | 14 migraciones de DB |
| Contactos en el dataset demo | 421 (context de software factory) |
| Latencia promedio de webhook end-to-end | ~1.5s (webhook → DB → Realtime → browser) |
| Cobertura de features de IA | RAG, embeddings, agente autónomo, memoria cross-session, confidence scoring, detección de duplicados, corrección de voz |
| i18n | 481+ keys en ES/EN |

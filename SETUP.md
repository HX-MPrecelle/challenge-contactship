# SETUP — Cuentas y proyectos externos

Esta guía cubre **cada paso** para dejar listas todas las cuentas y proyectos que ContactShip necesita. Está pensada asumiendo cero experiencia con HubSpot. Seguila de arriba para abajo: el orden está optimizado para que ninguna pieza dependa de algo que todavía no exista.

**Tiempo estimado total:** ~60–90 minutos.

**Costo:** todo gratis (free tier de cada servicio).

> 💡 Después de cada bloque hay una sección **"Qué guardar"** con los valores que tenés que copiar y pegar en `.env.local`. Te recomiendo abrir ya un archivo de notas (Notion, Apple Notes, lo que sea) y dejarlo abierto al lado mientras avanzás.

---

## 0. Checklist rápido

```
[ ] 1. GitHub: repo `contactship` creado
[ ] 2. Supabase: proyecto creado + credenciales copiadas
[ ] 3. Google Cloud: OAuth Client ID creado
[ ] 4. Supabase: provider Google habilitado
[ ] 5. HubSpot: cuenta personal creada
[ ] 6. HubSpot: developer account creada
[ ] 7. HubSpot: test account (sandbox) creada con sample data
[ ] 8. HubSpot: public app creada
[ ] 9. HubSpot: scopes y redirect URI configurados
[ ] 10. HubSpot: webhooks configurados (los completamos cuando esté Vercel)
[ ] 11. Vercel: cuenta + proyecto conectado al repo
[ ] 12. OpenAI: API key ya tenés ✅
[ ] 13. `.env.local` armado con todos los valores
```

---

## 1. GitHub — Repositorio

1. Ir a [github.com/new](https://github.com/new).
2. **Repository name:** `contactship` (o lo que prefieras).
3. **Owner:** tu usuario.
4. **Visibility:** `Private`. (Lo podés cambiar a público al final para que el evaluador lo vea, o agregarlo como colaborador.)
5. **NO** marques "Add a README" / "Add .gitignore" / "Add license" — el monorepo va a tener los suyos.
6. Click **Create repository**.
7. Copiá la URL HTTPS del repo (algo como `https://github.com/<tu-usuario>/contactship.git`).

### Qué guardar
```
GITHUB_REPO_URL=https://github.com/<tu-usuario>/contactship.git
```

---

## 2. Supabase — Proyecto

### 2.1 Crear cuenta y proyecto

1. Ir a [supabase.com](https://supabase.com) y entrar con GitHub (usá la misma cuenta que el repo).
2. En el dashboard, click **New project**.
3. Configurar:
   - **Organization:** la que aparece por default (tu username).
   - **Name:** `contactship`.
   - **Database Password:** generá uno fuerte y **guardalo ya** en tus notas. Después es trabajoso recuperarlo.
   - **Region:** elegí la más cercana (Brazil East / São Paulo si estás en LATAM).
   - **Pricing Plan:** `Free`.
4. Click **Create new project**. Tarda 2–3 minutos.

### 2.2 Copiar credenciales

Una vez creado, navegá:

#### URL del proyecto y anon key
- Sidebar izquierdo → **Project Settings** (ícono engranaje) → **Data API**.
- Copiá:
  - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
  - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

#### Service role key
- En la misma página **Data API** (o en **API Keys** según versión de UI):
  - **service_role** (secreto, ojo) → `SUPABASE_SERVICE_ROLE_KEY`
- **⚠️ Esta key es admin total al schema. Nunca la expongas al cliente.**

#### Connection string (para Drizzle)
- Sidebar → **Project Settings** → **Database** → **Connection string** → tab **URI**.
- Hay dos modos:
  - **Direct connection** (puerto 5432): bueno para migraciones desde tu máquina.
  - **Connection pooling — Transaction mode** (puerto 6543): para Vercel serverless.
- Vas a usar las **dos**:
  - `DATABASE_URL` → la de **Transaction pooler** (puerto 6543). Esta es la que usa la app en runtime.
  - `DIRECT_URL` → la **Direct connection** (puerto 5432). Esta la usa Drizzle solo para correr migraciones.
- Reemplazá `[YOUR-PASSWORD]` en cada string con el password que guardaste en 2.1.

### 2.3 Habilitar Realtime para nuestras tablas

Esto lo hacemos **después** de correr las migraciones (te lo recuerdo cuando llegue el momento). Por ahora alcanza con tener el proyecto creado.

### Qué guardar
```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
DATABASE_URL=postgresql://postgres.<ref>:[PASSWORD]@aws-0-<region>.pooler.supabase.com:6543/postgres
DIRECT_URL=postgresql://postgres.<ref>:[PASSWORD]@aws-0-<region>.pooler.supabase.com:5432/postgres
```

---

## 3. Google Cloud — OAuth Client (para login con Google)

Supabase Auth necesita un OAuth Client de Google para que el "Sign in with Google" funcione.

### 3.1 Proyecto en Google Cloud

1. Ir a [console.cloud.google.com](https://console.cloud.google.com).
2. Aceptar términos si es tu primera vez.
3. Arriba a la izquierda, dropdown de proyectos → **New Project**.
4. **Project name:** `contactship`. Click **Create**.
5. Asegurate de que el proyecto esté seleccionado en el dropdown arriba.

### 3.2 Configurar OAuth consent screen

1. Sidebar izquierdo (menú hamburguesa) → **APIs & Services** → **OAuth consent screen**.
2. **User Type:** `External`. Click **Create**.
3. Llenar:
   - **App name:** `ContactShip`
   - **User support email:** tu email
   - **Developer contact:** tu email
4. Click **Save and Continue**.
5. **Scopes:** click **Save and Continue** (no agregamos scopes extra; Supabase pide los suyos).
6. **Test users:** agregá tu propio email (mientras esté en "Testing" sólo los emails de acá pueden loguearse — para una demo alcanza). Click **Save and Continue**.
7. **Summary:** click **Back to Dashboard**.

### 3.3 Crear el OAuth Client ID

1. Sidebar → **APIs & Services** → **Credentials**.
2. Click **+ Create Credentials** → **OAuth client ID**.
3. **Application type:** `Web application`.
4. **Name:** `ContactShip Web Client`.
5. **Authorized JavaScript origins** — agregá:
   - `http://localhost:3000`
   - (Después agregás también la URL de Vercel cuando exista.)
6. **Authorized redirect URIs** — el valor exacto te lo da Supabase. Para encontrarlo:
   - Volvé a tu proyecto Supabase → **Authentication** → **Sign In / Up** (o **Providers** según versión) → **Google**.
   - Vas a ver un campo "Callback URL (for OAuth)" con un valor tipo `https://<ref>.supabase.co/auth/v1/callback`.
   - Copiá ese valor exacto y pegalo en este campo.
7. Click **Create**.
8. Se va a abrir un modal con **Client ID** y **Client secret**. **Copialos ya** — el secret no se vuelve a mostrar sin re-generarlo.

### Qué guardar
```
GOOGLE_OAUTH_CLIENT_ID=<...>.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=GOCSPX-<...>
```

> Estos los vas a pegar en Supabase en el paso 4 — no en `.env.local` (la app no los usa directo, pasan por Supabase).

---

## 4. Supabase — Habilitar provider Google

1. Supabase Dashboard → **Authentication** → **Sign In / Providers**.
2. Buscá **Google** en la lista y abrilo.
3. Activá el toggle **Enable Sign in with Google**.
4. Pegá:
   - **Client ID** (de Google Cloud, paso 3.3)
   - **Client Secret** (de Google Cloud, paso 3.3)
5. Click **Save**.

### Verificación
- Volvés a abrir el provider y los valores siguen ahí.
- En **Authentication** → **URL Configuration** anotá la **Site URL** — por ahora es `http://localhost:3000`. Después la actualizamos a la URL de Vercel.

---

## 5. HubSpot — Cuenta personal

HubSpot tiene **dos tipos de cuenta** que se confunden mucho:
- **Cuenta de HubSpot** (la herramienta de CRM normal): `app.hubspot.com`. Es donde se gestionan contactos, deals, etc.
- **Developer Account** (separada): `app.hubspot.com/developer`. Es donde se crean apps OAuth.

**Necesitamos las dos.** Empezamos por la personal.

### 5.1 Crear cuenta personal

1. Ir a [hubspot.com](https://www.hubspot.com).
2. Click **Get started free** (arriba a la derecha).
3. Registrate con tu email (podés usar Google).
4. Te va a hacer una serie de preguntas de onboarding (tamaño de empresa, rol, etc.). **Respondé cualquier cosa razonable** — no afecta nada técnico. Por ejemplo:
   - Industry: Software
   - Role: Developer
   - Company size: 1–5
5. Vas a terminar en un dashboard del CRM gratis.

### 5.2 (Opcional) Cargar sample data en esta cuenta

Esta cuenta personal **NO la vamos a usar para desarrollar** (vamos a usar un test account dentro del developer account, ver paso 7). Pero si querés tener data real para probar después, podés importar contactos sample acá.

> 🛑 **Saltar al paso 6 directamente.** No cargues data acá todavía.

---

## 6. HubSpot — Developer Account

### 6.1 Crear

1. Ir a [developers.hubspot.com](https://developers.hubspot.com).
2. Click **Create developer account** (arriba a la derecha).
3. Si te pide login, usá el mismo email que en el paso 5. HubSpot va a crear un **second account** asociado al mismo email — es normal.
4. Completá el onboarding:
   - **What's your role?** Developer.
   - **Company name:** ContactShip (o cualquier).
5. Vas a terminar en el dashboard developer (`app.hubspot.com/developer/<dev-id>`).

### Qué guardar
```
HUBSPOT_DEVELOPER_ACCOUNT_ID=<el número que aparece en la URL>
```

### Diferencia visual entre cuentas
- **CRM normal:** sidebar con Contacts, Companies, Deals, Tickets…
- **Developer account:** sidebar con Apps, Test accounts, Webhooks. **No tiene CRM data**.

Si alguna vez ves los dos en un selector arriba, asegurate de elegir el correcto:
- Para **crear/editar apps** → developer account.
- Para **ver contactos y testear que el sync funciona** → test account (paso 7).

---

## 7. HubSpot — Test Account (sandbox)

Esto es **clave** y suele confundir. Un "test account" en HubSpot es como un sandbox: una mini-cuenta de CRM **independiente**, ligada a tu developer account, donde podés:
- Tener contactos de prueba sin ensuciar una cuenta real.
- Instalar tu propia app OAuth.
- Recibir webhooks reales.

### 7.1 Crear

1. Developer account dashboard → sidebar izquierdo → **Test accounts**.
2. Click **Create app test account**.
3. **Name:** `ContactShip Dev`.
4. Click **Create**.
5. Te abre una nueva pestaña en la test account. La URL es `app.hubspot.com/contacts/<test-account-id>`. **Anotá ese ID** (es el "portal ID" o "hub ID").

### 7.2 Cargar sample data

HubSpot tiene un sample data generator que carga contactos, empresas y deals dummy.

1. Dentro de la test account → menú usuario arriba derecha → **Settings** (engranaje).
2. Sidebar izquierdo → **Data Management** → **Import & Export** → **Sample data** (si no aparece, ver alternativa abajo).
3. Click **Generate sample data**.

**Si no encuentra esa opción** (HubSpot cambia el UI seguido), alternativa manual:
1. Sidebar izquierdo → **CRM** → **Contacts**.
2. Click **Import** (arriba derecha) → **Start an import** → **File from computer** → **One file** → **One object** → **Contacts**.
3. Necesitás un CSV. Usá este ejemplo (guardalo como `sample_contacts.csv`):

```csv
First Name,Last Name,Email,Phone,Company,Lifecycle Stage
Ada,Lovelace,ada@analytical.engine,+44 20 7946 0001,Analytical Engine Ltd,lead
Alan,Turing,alan@bletchley.uk,+44 20 7946 0002,Bletchley Park,marketingqualifiedlead
Grace,Hopper,grace@unisys.com,+1 215 555 0102,Unisys,salesqualifiedlead
Linus,Torvalds,linus@kernel.org,+358 9 555 0103,Linux Foundation,opportunity
Margaret,Hamilton,margaret@nasa.gov,+1 281 555 0104,NASA,customer
Tim,Berners-Lee,tim@w3.org,+44 20 7946 0005,W3C,evangelist
Donald,Knuth,knuth@stanford.edu,+1 650 555 0106,Stanford,lead
Barbara,Liskov,liskov@mit.edu,+1 617 555 0107,MIT,lead
Edsger,Dijkstra,dijkstra@ut.nl,+31 40 555 0108,Eindhoven University,marketingqualifiedlead
John,Carmack,carmack@idsoftware.com,+1 469 555 0109,id Software,customer
```

Subilo, mapeá las columnas a las properties que HubSpot detecta auto, y dale **Finish import**.

### Verificación
- Sidebar → **Contacts** → ves los 10 contactos cargados.
- En la URL del navegador, anotá el número después de `/contacts/` — es el **portal/hub ID** de la test account.

### Qué guardar
```
HUBSPOT_TEST_PORTAL_ID=<número>
```

---

## 8. HubSpot — Crear la Public App (OAuth)

Volvé al **developer account** (no la test account).

1. Developer dashboard → sidebar → **Apps**.
2. Click **Create app**.
3. Te ofrece tipos:
   - **Public app** ← elegí esta. (Es la que soporta OAuth.)
   - Private app → solo para una cuenta, no OAuth, no nos sirve.
4. Click **Next**.

Te lleva al editor de la app, con tabs arriba. Vamos uno por uno.

### 8.1 Tab "App info"
- **Public app name:** `ContactShip`.
- **Description:** "AI-first CRM workspace that mirrors HubSpot in realtime."
- **Logo:** opcional, podés saltarlo.
- **Support email:** tu email.
- Click **Save** (arriba derecha; el botón puede llamarse "Save" o aparecer al cambiar de tab).

### 8.2 Tab "Auth"
Esta es la importante.

#### Client ID y Client Secret
Apenas creás la app, HubSpot genera estos dos. Los vas a encontrar arriba en la tab Auth:
- **Client ID** → un UUID.
- **Client secret** → un UUID.

**Copialos ya.** El secret se muestra completo solo unas veces.

#### Redirect URLs
- Agregá: `http://localhost:3000/api/hubspot/callback`
- Después vamos a agregar también `https://<tu-app>.vercel.app/api/hubspot/callback` cuando esté Vercel.

#### Scopes
En la sección **Scopes** → **Add new scope**. Marcá exactamente estos:

| Scope | Por qué |
|---|---|
| `oauth` | Requerido para el flujo OAuth |
| `crm.objects.contacts.read` | Leer contactos |
| `crm.objects.contacts.write` | Crear/editar contactos |
| `crm.objects.notes.read` | Leer notas (engagements) |
| `crm.objects.notes.write` | Crear notas |
| `crm.schemas.contacts.read` | Saber qué propiedades existen en el portal |

Hay tres columnas: **Required**, **Optional**, **Conditional**. Para todos, marcalos como **Required** (la app no funciona sin ellos).

> 🛑 Si HubSpot muestra alguno como "Sensitive Scope" y pide review para producción, no te preocupes — en developer/test accounts funciona sin review. Solo importaría si quisiéramos publicar la app al marketplace.

Click **Save**.

### 8.3 Tab "Webhooks"
La vamos a configurar **cuando tengamos la URL de Vercel** (paso 11). Por ahora dejala vacía.

### Qué guardar
```
HUBSPOT_CLIENT_ID=<uuid>
HUBSPOT_CLIENT_SECRET=<uuid>
HUBSPOT_REDIRECT_URI=http://localhost:3000/api/hubspot/callback
HUBSPOT_SCOPES=oauth crm.objects.contacts.read crm.objects.contacts.write crm.objects.notes.read crm.objects.notes.write crm.schemas.contacts.read
```

---

## 9. Vercel — Cuenta y proyecto

> ⏳ **Hacé este paso después de que yo haya empujado el primer commit al repo.** Si lo hacés antes, no hay nada que deployar. Te aviso cuando llegue el momento.

### 9.1 Cuenta

1. Ir a [vercel.com](https://vercel.com).
2. Click **Sign Up** → **Continue with GitHub**.
3. Autorizá Vercel en GitHub.
4. Elegí **Hobby plan** (gratis).

### 9.2 Importar el repo

1. Dashboard → **Add New...** → **Project**.
2. **Import Git Repository** → buscá `contactship` → **Import**.
3. **Framework Preset:** Next.js (debería detectarse automático).
4. **Root Directory:** `apps/web` (importante: es monorepo).
5. **Build & Output Settings:** dejalos default.
6. **Environment Variables:** las vamos a configurar todas acá. Te paso el bloque listo (ver paso 12 abajo).
7. Click **Deploy**.

### 9.3 Después del primer deploy

- Vercel te asigna una URL tipo `https://contactship-<hash>.vercel.app` y un dominio "production" `https://contactship-<tu-user>.vercel.app`.
- **Anotá la URL de producción**.

### Qué guardar
```
VERCEL_URL=https://<tu-app>.vercel.app
```

### 9.4 Actualizar lo que dependía de la URL de Vercel

Ahora que existe:

#### Google Cloud OAuth Client (paso 3.3)
1. Volvé a [console.cloud.google.com](https://console.cloud.google.com) → APIs & Services → Credentials.
2. Click en `ContactShip Web Client`.
3. **Authorized JavaScript origins** → agregá `https://<tu-app>.vercel.app`.
4. **Authorized redirect URIs** → ya tenés la callback URL de Supabase; no hace falta tocarla.
5. Save.

#### Supabase Site URL
1. Supabase → **Authentication** → **URL Configuration**.
2. **Site URL** → cambialo a `https://<tu-app>.vercel.app`.
3. **Redirect URLs** → agregá:
   - `https://<tu-app>.vercel.app/**`
   - `http://localhost:3000/**`
4. Save.

#### HubSpot App
1. Developer dashboard → tu app → Auth tab.
2. **Redirect URLs** → agregá `https://<tu-app>.vercel.app/api/hubspot/callback`.
3. Save.

---

## 10. HubSpot — Webhooks (una vez que esté Vercel)

> ⏳ Solo cuando tengas la URL de Vercel del paso 9.

1. Developer dashboard → tu app → **Webhooks** tab.
2. **Target URL:** `https://<tu-app>.vercel.app/api/hubspot/webhook`.
3. **Max concurrent requests:** dejalo en `10`.
4. Click **Create subscription**. Vas a agregar **una por una**:

| Event | Object type |
|---|---|
| Contact created | Contact |
| Contact propertyChange | Contact — y abajo te pide elegir properties: marcá al menos `email`, `firstname`, `lastname`, `phone`, `company`, `lifecyclestage` |
| Contact deleted | Contact |
| Note created | Note (si aparece) |
| Note propertyChange | Note (si aparece) — propiedad: `hs_note_body` |

> 💡 Si los eventos de **Note** no aparecen en la UI, no es bloqueante: las notas las traemos por API en el detalle del contacto. Lo documentamos como limitación.

5. **Activá** las subscriptions (toggle).
6. Probá: en la **test account** del paso 7, editá un contacto. En la tab Webhooks de la developer app vas a ver el log de eventos enviados.

> 🛑 **Importante:** los webhooks se disparan **desde la cuenta que instaló la app**. Vamos a instalar la app en la test account la primera vez que conectemos HubSpot desde la UI de ContactShip (flow OAuth). Los webhooks no llegan antes de eso.

---

## 11. OpenAI — Confirmar acceso

Ya tenés API key. Verifiquemos lo necesario:

1. Ir a [platform.openai.com](https://platform.openai.com).
2. **Settings** → **Limits** → asegurate de que tu cuenta tiene acceso a:
   - `gpt-4.1` o `gpt-4o` (cualquiera sirve, ajusto en código).
   - Streaming habilitado (lo está por default).
3. **Billing** → confirmá que tenés algún crédito o billing activo. Las tools de la API responses requieren billing activo aunque uses poco.

### Qué guardar
```
OPENAI_API_KEY=sk-...
```

---

## 12. Bloque final — `.env.local`

Una vez que tengas todos los valores, te van a quedar así (yo te genero el `.env.example` en el repo apenas arranquemos):

```env
# --- App ---
NEXT_PUBLIC_APP_URL=http://localhost:3000

# --- Supabase ---
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# --- Database (Drizzle) ---
DATABASE_URL=postgresql://postgres.<ref>:[PASSWORD]@aws-0-<region>.pooler.supabase.com:6543/postgres
DIRECT_URL=postgresql://postgres.<ref>:[PASSWORD]@aws-0-<region>.pooler.supabase.com:5432/postgres

# --- HubSpot ---
HUBSPOT_CLIENT_ID=<uuid>
HUBSPOT_CLIENT_SECRET=<uuid>
HUBSPOT_REDIRECT_URI=http://localhost:3000/api/hubspot/callback
HUBSPOT_WEBHOOK_SECRET=<lo genera HubSpot al activar webhooks; lo agregamos en paso 10>

# --- OpenAI ---
OPENAI_API_KEY=sk-...

# --- Token encryption (lo genero yo cuando arranque) ---
ENCRYPTION_KEY=<32 bytes base64 — te lo paso>
```

> El `.env.local` es **solo local**. Las mismas variables las vamos a cargar en **Vercel → Project Settings → Environment Variables** cambiando los `localhost:3000` por tu URL de Vercel.

---

## 13. Checklist final antes de arrancar a codear

Antes de darme el "go" para empezar el día 1:

- [ ] GitHub repo creado, URL copiada.
- [ ] Supabase proyecto creado, las 5 variables de DB/Auth copiadas.
- [ ] Google OAuth Client creado, ID y Secret cargados en Supabase.
- [ ] HubSpot developer account + test account + sample data cargada.
- [ ] HubSpot Public App creada, scopes configurados, Client ID + Secret copiados.
- [ ] OpenAI API key con billing activo.

**No necesitás Vercel todavía** — se hace el día 1 después del primer push.

Cuando los primeros 6 items estén ✅, pasame el bloque `.env.local` completo (lo podés mandar por chat, no hay nada que la IA no pueda ver ahí ya) y arrancamos.

---

## Apéndice — Errores comunes y cómo desbloquearse

**"Login with Google" me pega `redirect_uri_mismatch`**
→ El redirect URI en Google Cloud no coincide exactamente con el que Supabase pide. Tiene que ser **idéntico** carácter por carácter, incluyendo `https://`.

**OAuth de HubSpot devuelve `invalid scope`**
→ El scope que pediste en la URL de autorización no está en la lista marcada como Required en la app. Volvé a la tab Auth y verificá.

**Los webhooks de HubSpot no llegan**
→ Tres causas, en orden de probabilidad:
1. No instalaste la app en la test account (eso pasa solo cuando hacés el flow OAuth completo desde el cliente).
2. La URL de Vercel no es pública (proyecto en "Preview" sin alias). Confirmá que estás usando la URL de "Production".
3. La firma del webhook no valida en el servidor — eso lo manejo yo en código, pero si en developement los webhooks no llegan al log de HubSpot, no es esto.

**Supabase me muestra "Project paused"**
→ Free tier pausa proyectos sin actividad por 7 días. Lo reactivás con un click desde el dashboard. Cero pérdida de datos.

**HubSpot test account "doesn't exist" cuando intento usar el ID**
→ El portal ID de la **developer account** ≠ portal ID de la **test account**. El que pongas en `HUBSPOT_TEST_PORTAL_ID` tiene que ser el de la test account (el que aparece en la URL cuando estás viendo contactos).

**No encuentro la "Sample data" en Settings de la test account**
→ Mirá el paso 7.2, sección "Si no encuentra esa opción". Cargás el CSV manualmente.

---

Cualquier cosa que veas confusa o que no encuentre la opción exacta, escribime y lo destrabamos. HubSpot cambia el UI cada par de meses así que algún nombre de botón puede haberse movido — el flow conceptual es el mismo.

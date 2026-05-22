#!/usr/bin/env node
/**
 * Genera seed-data-softfactory.json — 521 contactos para una Software Factory.
 *
 * Contexto: la empresa vendedora es una Software Factory latinoamericana.
 * Sus clientes son empresas de múltiples industrias que necesitan:
 *   - Desarrollo de software custom
 *   - Staff augmentation (devs, QA, PM, diseñadores)
 *   - Desarrollo de MVPs / productos digitales
 *   - Transformación digital / migración de sistemas legacy
 *   - Integración de APIs y sistemas
 *
 * El CRM tiene contactos = buyers y decision makers en esas empresas.
 */

import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Nombres ─────────────────────────────────────────────────────────────────
const FIRST = [
  "Alejandro","Valentina","Sebastián","Camila","Matías","Lucía","Nicolás","Sofía",
  "Diego","Isabella","Andrés","Martina","Felipe","Valeria","Joaquín","Catalina",
  "Rodrigo","Gabriela","Carlos","Florencia","Pablo","Natalia","Tomás","Paula",
  "Fernando","Carolina","Miguel","Ana","Ricardo","Laura","Eduardo","Patricia",
  "Gustavo","Mercedes","Hernán","Claudia","Roberto","Elena","Marcelo","Sandra",
  "Cristian","Daniela","Emilio","Verónica","Santiago","Andrea","Iván","Mónica",
  "Rafael","Jimena","Agustín","Beatriz","Leandro","Rocío","Mario","Fernanda",
  "Ramiro","Silvia","César","Eugenia","Patricio","Lorena","Ignacio","Carla",
  "Bruno","Noelia","Facundo","Yanina","Gonzalo","Pilar","Leonardo","Romina",
  "Ezequiel","Micaela","Mauro","Renata","Damián","Soledad","Franco","Antonella",
  "Lucas","Aldana","Maximiliano","Cecilia","Ariel","Melina","Nahuel","Brenda",
  "Elías","Nadia","Kevin","Estefanía","Brian","Vanesa","Iñaki","Marta",
];
const LAST = [
  "García","Rodríguez","López","Martínez","González","Pérez","Sánchez","Ramírez",
  "Torres","Flores","Rivera","Gómez","Díaz","Cruz","Morales","Reyes","Herrera",
  "Jiménez","Mendoza","Vargas","Castro","Ortiz","Ramos","Moreno","Rojas","Núñez",
  "Álvarez","Muñoz","Romero","Alvarado","Gutiérrez","Chávez","Ríos","Vásquez",
  "Medina","Castillo","Fernández","Aguilar","Navarro","Cortés","Suárez","Delgado",
  "Vera","Bravo","Peña","Ruiz","Molina","Cabrera","Acosta","Lara","Soto",
  "Salinas","Ibáñez","Fuentes","Cárdenas","Arias","Espinoza","Méndez","Ponce",
  "Figueroa","Vega","Palacios","León","Guerrero","Carrillo","Restrepo","Ospina",
  "Henao","Marín","Cano","Velásquez","Zapata","Giraldo","Ríos","Montes",
];

// ─── Empresas clientes (quienes contratan la software factory) ───────────────
const CLIENTS = {
  "Retail / E-commerce": [
    "MegaStore SA","RetailTech Group","Comercios Unidos","FastShop","MercaDigital",
    "TiendaNova","CompraFácil","DistribuidoraPro","LogiRetail","StorePlus",
    "Cadena Atlántico","ComerNext","ShopGroup Latam","VentasDirect","NovaMarca",
  ],
  "Banca / Finanzas": [
    "Banco Regional","FinancieraSur","InversoRes SA","CreditCorp","AseguradoraNorte",
    "Cooperativa Financiera","FondosMutual","BancoDigital","PrestaFácil","CapitalGroup",
    "Microfinanzas Andinas","GestoraInversiones","PatrimonioFin","SegurosTotal","BolsaVirtual",
  ],
  "Salud / HealthTech": [
    "Clínica Central","Red de Salud","SaludGroup","MedCenter","HospitalDigital",
    "Farmacéutica Andina","ClínicaPrivada","SaludYBienestar","DiagnósticoTotal","MediRed",
    "ObraSocial Digital","CentroMédico Norte","Salud Integral","LabCentral","BienestarHoy",
  ],
  "Logística / Transporte": [
    "LogiGroup","TransporteSur","FleetMaster","CargoAndes","DistribuidoraLogí",
    "ShipFast Latam","CamionesUnidos","LogiConect","PortLogistics","AirCargo Regional",
    "ExpressFreight","TransLogística","MovilCarga","RutaTotal","PuertoSistemas",
  ],
  "Industria / Manufactura": [
    "IndustrialGroup SA","FábricaDigital","ManuTech","AceroAndes","MetalúrgicaSur",
    "PlásticosIndustriales","QuímicaAndes","TextilModerno","MaderaYMuebles","ConstruTech",
    "Energía Industrial","AgroIndustria","Minería Digital","PapelGroup","AgroTech SA",
  ],
  "Gobierno / Municipios": [
    "Municipalidad de Tigre","Gobierno de Salta","Municipio San Martín","Provincia Digital",
    "Ministerio de Modernización","Ente Municipal Tech","Secretaría Digital","GobTech",
    "Municipio Costero","Ciudad Inteligente SA","Provincia Norte","Ente Regulador Digital",
  ],
  "Educación": [
    "Universidad del Sur","Instituto TechEdu","ColegioDigital","AcademiaOnline",
    "EdTech Institute","Universidad Privada","Instituto Formación","CampusVirtual",
    "Escuela Digital","GrupoEducativo","TutorPlus","AprendizajeActivo",
  ],
  "Telecomunicaciones / Media": [
    "TelecomGroup","MediaDigital","StreamContent","RadioOnline","CanalDigital",
    "TelefoníaRegional","InternetAndes","ConnectSur","BroadcastGroup","MediaPlus",
  ],
  "Seguros": [
    "SegurosAndes","AseguradoraTotal","ProtecciónFamiliar","SegurosDigitales",
    "ReasegurosGroup","CorredoraSeguros","SeguridadPlus","BrokerDigital",
  ],
  "Energía / Utilities": [
    "EnergíaAndes","UtilitiesDigital","SolarTech","GasGroup","ElectricSur",
    "AguaDigital","EnergíaRenovable","ServiciosBasicos SA",
  ],
};

const LOCATIONS = [
  { country:"Argentina", cities:["Buenos Aires","Córdoba","Rosario","Mendoza","La Plata","Tucumán","Mar del Plata","Salta"] },
  { country:"Chile", cities:["Santiago","Valparaíso","Concepción","Viña del Mar","Temuco","Antofagasta","La Serena"] },
  { country:"México", cities:["Ciudad de México","Guadalajara","Monterrey","Puebla","Tijuana","Querétaro","León"] },
  { country:"Colombia", cities:["Bogotá","Medellín","Cali","Barranquilla","Bucaramanga","Cartagena","Pereira"] },
  { country:"España", cities:["Madrid","Barcelona","Valencia","Sevilla","Bilbao","Málaga","Zaragoza"] },
  { country:"Brasil", cities:["São Paulo","Rio de Janeiro","Belo Horizonte","Brasília","Curitiba","Porto Alegre"] },
  { country:"Uruguay", cities:["Montevideo","Punta del Este","Maldonado","Salto"] },
  { country:"Perú", cities:["Lima","Arequipa","Trujillo","Cusco"] },
  { country:"Ecuador", cities:["Quito","Guayaquil","Cuenca","Manta"] },
  { country:"Paraguay", cities:["Asunción","Ciudad del Este","Encarnación"] },
  { country:"United States", cities:["Miami","New York","San Francisco","Austin","Chicago"] },
  { country:"Panama", cities:["Ciudad de Panamá","Colón"] },
];

// Roles que contratan software factories
const TITLES = [
  "CTO","CIO","CDO","CEO","COO","CFO",
  "VP of Engineering","VP of Technology","VP of Digital Transformation","VP of IT",
  "Head of Engineering","Head of Technology","Head of Digital","Head of IT","Head of Innovation",
  "Director de Tecnología","Director de Sistemas","Director de IT","Director de Innovación",
  "Director de Transformación Digital","Director de Operaciones","Director General",
  "Gerente de IT","Gerente de Sistemas","Gerente de Tecnología","Gerente de Proyectos",
  "Gerente de Innovación","Gerente de Operaciones","Gerente de Transformación Digital",
  "IT Manager","Engineering Manager","Product Manager","Project Manager","PMO Manager",
  "Jefe de Sistemas","Jefe de Proyectos","Jefe de IT","Jefe de Tecnología",
  "Chief Digital Officer","Chief Innovation Officer","Chief Technology Officer",
  "Digital Transformation Lead","Software Architecture Lead","IT Operations Manager",
];

// Competidores de una software factory latinoamericana
const COMPETITORS = [
  "Globant","NEORIS","Accenture","Softtek","Pragma","MakingSense",
  "Wolox","Avature","Belatrix","Perficient","EPAM","Thoughtworks",
  "Endava","Nexu","SoftServe","Sapient","Infosys","Wipro",
];

// Proyectos típicos que se le venden a clientes
const PROJECTS = [
  "migración de sistema legacy a microservicios",
  "desarrollo de app móvil iOS/Android",
  "plataforma de e-commerce B2B custom",
  "staff augmentation para equipo de backend",
  "integración API con sistemas ERP/SAP",
  "portal de autoservicio para clientes",
  "sistema de gestión de turnos y citas",
  "plataforma de reportes y BI",
  "automatización de procesos internos (RPA)",
  "modernización de infraestructura cloud (AWS/GCP)",
  "desarrollo de MVP de producto digital",
  "sistema de facturación electrónica",
  "chatbot y asistente virtual para atención al cliente",
  "plataforma de pagos online",
  "sistema de gestión de flotas",
  "digitalización de procesos de RRHH",
  "plataforma de e-learning interna",
  "sistema de control de inventario en tiempo real",
  "rediseño y desarrollo de portal institucional",
  "integración con marketplaces (MercadoLibre, Rappi)",
  "desarrollo de API pública para partners",
  "sistema de onboarding digital de clientes",
  "plataforma de analytics y dashboard ejecutivo",
  "migración de datos y limpieza de base legada",
];

const SOURCES = ["ORGANIC_SEARCH","PAID_SEARCH","REFERRALS","SOCIAL_MEDIA","EMAIL_MARKETING","DIRECT_TRAFFIC","EVENT","PARTNER"];
const BUYING_ROLES = ["DECISION_MAKER","INFLUENCER","BUDGET_HOLDER","CHAMPION","END_USER","BLOCKER"];
const EMPLOYEES = ["10-25","25-50","50-100","100-250","250-500","500-1000","1000-5000","5000+"];
const REVENUES = ["500000","1000000","2500000","5000000","10000000","25000000","50000000","100000000"];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function rnd(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function rndName() { return `${rnd(FIRST)} ${rnd(LAST)}`; }
function rndProject() { return rnd(PROJECTS); }
function rndComp(excl=[]) { return rnd(COMPETITORS.filter(c => !excl.includes(c))); }
function rndBudget() {
  return rnd(["$30.000","$50.000","$80.000","$120.000","$200.000","$300.000","$500.000",
               "$8.000/mes","$12.000/mes","$18.000/mes","$25.000/mes","$40.000/mes"]);
}

// ─── Templates de notas (riquísimas para IA) ─────────────────────────────────
function makeNote(stage, leadStatus) {
  const p1 = rndProject(), p2 = rndProject();
  const c1 = rndComp(), c2 = rndComp([c1]);
  const budget = rndBudget();
  const champion = rndName();

  const customerNotes = [
    `Proyecto de ${p1} entregado en ${rnd(["Q1","Q2","Q3","Q4"])}. Cliente satisfecho, NPS 9/10. Renovaron contrato para ${p2}. Champion: ${champion}. Budget aprobado ${budget}. Evaluaron ${c1} pero eligieron nuestra velocidad de entrega y comunicación en español. Potencial upsell a soporte mensual.`,
    `Deal cerrado tras ${rnd([3,4,6,8])} meses. Ganamos vs ${c1} (${rnd([30,40,50])}% más caro) y ${c2}. Proyecto: ${p1}. Equipo asignado: ${rnd([2,3,4,5,6])} devs + ${rnd([1,2])} QA. Tiempo de entrega: ${rnd([3,4,6])} meses. Go-live exitoso. El CTO (${champion}) quedó como referente para nuevos proyectos.`,
    `Cliente activo hace ${rnd([6,8,10,12])} meses. Primer proyecto fue ${p1}, ahora en fase 2: ${p2}. Equipo de ${rnd([4,6,8])} personas. Budget total del año: ${budget}. Solicitó incorporar ${rnd([1,2])} developers senior más. Próximo QBR en ${rnd(["junio","julio","agosto","septiembre"])}.`,
    `Referral de ${rnd(["su red de directores","SaaStr Latam","B2B Connect","un cliente existente"])}. Proyecto de ${p1} completado en tiempo y forma. ROI estimado por el cliente: ${rnd(["3x","4x","5x","6x"])} en primer año. Expansión contratada por ${budget}/año adicional. Testimonial en proceso.`,
    `Ganamos vs ${c1} por nuestra expertise en ${rnd(["React/Node","Java Spring","Python/Django","mobile nativo","AWS","cloud-native"])} y conocimiento del mercado local. Budget: ${budget}. Entregamos ${p1} en ${rnd([60,90,120])} días. Post-implementación: 0 incidentes críticos en producción. MRR actual: ${rnd(["$8.000","$12.000","$15.000","$20.000"])}/mes.`,
  ];

  const lostNotes = [
    `Perdimos vs ${c1}. Razón principal: ya tenían relación previa y ofrecieron ${rnd([20,30,40])}% de descuento. Proyecto: ${p1}. Budget era ${budget}. Revisitar en ${rnd(["Q1 2026","Q2 2026","12 meses"])} cuando expire su contrato. El CTO (${champion}) quedó abierto a futuro.`,
    `Congelaron el proyecto de ${p1} por recorte presupuestario en Q${rnd([2,3,4])}. Estaban entre nosotros y ${c1}. No fue decisión de calidad sino de timing. Nutrir con casos de éxito cada 2 meses. Presupuesto para el año que viene estimado en ${budget}.`,
    `Eligieron ${c1} por integración nativa con su stack existente (${rnd(["SAP","Oracle","Microsoft 365","Salesforce"])}). Nuestro pricing era ${rnd([10,15,20])}% menor pero el factor técnico fue determinante. Considerar desarrollar conector oficial. Buen prospect si cambian de stack.`,
    `Deal perdido: el champion (${champion}) fue desvinculado. El nuevo CTO tiene relación personal con ${c2}. Difícil de revertir a corto plazo. Monitorear cambios en LinkedIn. El proyecto de ${p1} sigue pendiente para alguien.`,
    `Sin presupuesto aprobado hasta Q1 del año que viene. La iniciativa de ${p1} fue bajada de prioridad por el board. Buena relación establecida. Seguimiento con content mensual. Estimación de budget futuro: ${budget}.`,
  ];

  const opportunityHotNotes = [
    `Demo técnica realizada. El equipo de engineering quedó impresionado con nuestro approach de ${rnd(["microservicios","DevOps","testing automatizado","arquitectura cloud-native"])}. Evaluando también ${c1}. Proyecto: ${p1}. Budget confirmado: ${budget}. Decision esperada en ${rnd([2,3,4])} semanas. Champion: ${champion} (Head of Engineering).`,
    `RFP recibida para proyecto de ${p1}. Shortlist final: nosotros vs ${c1} vs ${c2}. Propuesta presentada esta semana. Budget owner: CFO. Timeline de entrega exigido: ${rnd([60,90,120])} días. Diferenciador: metodología ágil con sprints de 2 semanas. Cierre estimado: ${rnd(["15/06","30/06","15/07","01/08"])}.`,
    `Trial de 2 semanas completado. El equipo técnico validó nuestra capacidad en ${rnd(["React","Flutter","Python","Java","Node.js"])}. NPS del POC: ${rnd([8,9])}/10. Reunión de cierre con el CTO agendada. Budget: ${budget}. Competidor activo: ${c1} con propuesta ${rnd([10,15,20,30])}% más cara.`,
    `Referral calificado vía ${rnd(["cliente existente","LinkedIn","conferencia","partner"])}. Ya conocen nuestro trabajo en ${rnd(["proyectos similares","el sector","la industria"])}. Proceso acelerado: saltean el POC. Proyecto: ${p1}. Decision maker confirmado: ${champion} (CTO). Deal size: ${budget}.`,
    `Urgencia real: sistema legacy colapsando, necesitan reemplazarlo en ${rnd([3,4,6])} meses. Proyecto: ${p1}. Budget desbloqueado de urgencia: ${budget}. Evaluaron ${c1} pero nuestro tiempo de respuesta (24hs vs 1 semana) fue decisivo. Propuesta técnica enviada. Esperan firma esta semana.`,
  ];

  const opportunityStalledNotes = [
    `Última actividad hace ${rnd([20,25,30,35,40])} días. Demo fue positiva (proyecto: ${p1}) pero no avanzamos. Champion (${champion}) no responde desde que fue a vacaciones. Evaluando también ${c1}. Budget era ${budget}. Recomendación: cambiar punto de contacto — hablar directamente con el CTO.`,
    `POC iniciado hace ${rnd([3,4,5])} semanas, no hay feedback. El equipo técnico cambió de prioridades. IT Director (${champion}) en licencia. ${c2} también en el proceso. Envié ${rnd([2,3])} emails de seguimiento sin respuesta. Última opción: oferta de extensión gratuita del POC.`,
  ];

  const sqlNotes = [
    `BANT calificado: budget (${budget} confirmado), autoridad (${champion}, Head of IT), necesidad (${p1}), timing (Q${rnd([2,3])} de este año). Fuente: conferencia ${rnd(["AWS re:Invent","Ágiles","PyCon","JSConf Latam","SAP TechEd"])}. Primera demo técnica agendada. Alto potencial.`,
    `Inbound desde LinkedIn ad "¿Necesitás escalar tu equipo tech?". Score ${rnd([75,80,85,90])}/100. Empresa de ${rnd([200,500,1000])} empleados en ${rnd(["retail","finanzas","salud","logística"])}. Necesidad declarada: ${p1}. Primer contacto en ${rnd([1,2,3])} días. ICP exacto.`,
    `Referral del cliente ${rnd(["RetailTech Group","FinancieraSur","Clínica Central","LogiGroup"])}. Ya conocen nuestro trabajo. Quieren ver capability en ${rnd(["mobile","cloud","AI/ML","data engineering"])}. Budget: ${budget}. Decision maker: ${champion}. Timeline: urgente (proyecto para Q${rnd([2,3])}).`,
  ];

  const mqlNotes = [
    `Descargó case study sobre migración de sistema de pagos en retail. Score ${rnd([60,65,70])}/100. ${rnd([2,3])} visitas al sitio.`,
    `Attendee del webinar "Transformación digital en ${rnd(["retail","banca","salud","logística"])}". Participó activamente. LinkedIn muestra búsqueda de proveedores de desarrollo. Empresa de ${rnd([100,200,500])} empleados. Trigger: nuevo CTO asumió hace ${rnd([1,2,3])} meses.`,
  ];

  if (stage === "customer") return rnd(customerNotes);
  if (leadStatus === "UNQUALIFIED" || leadStatus === "BAD_TIMING") return rnd(lostNotes);
  if (stage === "opportunity" && (leadStatus === "OPEN_DEAL" || leadStatus === "IN_PROGRESS")) return rnd(opportunityHotNotes);
  if (stage === "opportunity") return rnd(opportunityStalledNotes);
  if (stage === "salesqualifiedlead") return rnd(sqlNotes);
  if (stage === "marketingqualifiedlead") return rnd(mqlNotes);
  return null;
}

// ─── Plan de distribución (521 contactos) ────────────────────────────────────
// [lifecycle_stage, lead_status, count]
const PLAN = [
  ["customer",              null,                    40],
  ["customer",              "OPEN_DEAL",             18],
  ["customer",              "IN_PROGRESS",           12],
  ["opportunity",           "OPEN_DEAL",             35],
  ["opportunity",           "IN_PROGRESS",           30],
  ["opportunity",           "ATTEMPTED_TO_CONTACT",  18],
  ["opportunity",           "CONNECTED",             15],
  ["opportunity",           "BAD_TIMING",            12],
  ["salesqualifiedlead",    "IN_PROGRESS",           30],
  ["salesqualifiedlead",    "OPEN",                  25],
  ["salesqualifiedlead",    "CONNECTED",             20],
  ["salesqualifiedlead",    "ATTEMPTED_TO_CONTACT",  15],
  ["salesqualifiedlead",    "UNQUALIFIED",           10],
  ["marketingqualifiedlead","NEW",                   25],
  ["marketingqualifiedlead","OPEN",                  20],
  ["marketingqualifiedlead","IN_PROGRESS",           15],
  ["lead",                  "NEW",                   25],
  ["lead",                  "ATTEMPTED_TO_CONTACT",  15],
  ["lead",                  "BAD_TIMING",            10],
  ["lead",                  "UNQUALIFIED",            8],
  ["subscriber",            "NEW",                   18],
  ["subscriber",            null,                     5],
];

// ─── Generador ────────────────────────────────────────────────────────────────
const usedEmails = new Set();
const contacts = [];

for (const [stage, leadStatus, count] of PLAN) {
  for (let i = 0; i < count; i++) {
    const first = rnd(FIRST);
    const last = rnd(LAST);
    const industry = rnd(Object.keys(CLIENTS));
    const company = rnd(CLIENTS[industry]);
    const loc = rnd(LOCATIONS);
    const city = rnd(loc.cities);
    const title = rnd(TITLES);

    const slug = company.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 18);
    const user = `${first.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"")}`;
    let email = `${user}@${slug}.${rnd(["com","co","org","net","io"])}`;
    let n = 1;
    while (usedEmails.has(email)) { email = `${user}${n++}@${slug}.com`; }
    usedEmails.add(email);

    const c = {
      firstname: first,
      lastname: last,
      email,
      phone: `+${rnd([54,56,52,57,34,55,598,51,1])}`
             + String(Math.floor(Math.random() * 9e9 + 1e9)).slice(0,9),
      company,
      jobtitle: title,
      lifecyclestage: stage,
      country: loc.country,
      city,
      industry,
      numemployees: rnd(EMPLOYEES),
      hs_analytics_source: rnd(SOURCES),
    };

    if (leadStatus) c.hs_lead_status = leadStatus;
    if (Math.random() > 0.5) c.annualrevenue = rnd(REVENUES);
    if (Math.random() > 0.5) c.hs_buying_role = rnd(BUYING_ROLES);
    if (Math.random() > 0.55) c.website = `https://www.${slug}.com`;

    const note = makeNote(stage, leadStatus);
    if (note) c.message = note;

    contacts.push(c);
  }
}

// Shuffle
for (let i = contacts.length - 1; i > 0; i--) {
  const j = Math.floor(Math.random() * (i + 1));
  [contacts[i], contacts[j]] = [contacts[j], contacts[i]];
}

// ─── Stats ────────────────────────────────────────────────────────────────────
const withNotes = contacts.filter(c => c.message).length;
const withComp = contacts.filter(c => c.message &&
  COMPETITORS.some(comp => c.message.includes(comp))).length;
const stageDist = {};
contacts.forEach(c => { stageDist[c.lifecyclestage] = (stageDist[c.lifecyclestage]||0)+1; });

console.log(`✓ Contactos generados: ${contacts.length}`);
console.log(`✓ Con notas CRM: ${withNotes}`);
console.log(`✓ Con menciones de competidores: ${withComp}`);
console.log(`✓ Países: ${[...new Set(contacts.map(c => c.country))].length}`);
console.log(`✓ Industrias: ${[...new Set(contacts.map(c => c.industry))].length}`);
console.log("✓ Por stage:", stageDist);

const out = join(__dirname, "seed-data-softfactory.json");
writeFileSync(out, JSON.stringify(contacts, null, 2), "utf8");
console.log(`\nGuardado en ${out}`);

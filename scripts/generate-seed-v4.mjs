#!/usr/bin/env node
/**
 * Generates seed-data-v4.json — 287 rich contacts for ContactShip demo.
 * Run: node scripts/generate-seed-v4.mjs
 *
 * Designed to maximize AI feature quality:
 * - Competitive intelligence: ~180 contacts with CRM notes mentioning competitors
 * - Win/Loss analysis: ~80 customers + ~35 lost (UNQUALIFIED/BAD_TIMING)
 * - Pipeline health: varied stages with activity gaps
 * - Autonomous agent: variety of risk signals in notes
 * - Semantic search: rich text across industries and roles
 */

import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Reference data ──────────────────────────────────────────────────────────

const FIRST_NAMES = [
  "Alejandro","Valentina","Sebastián","Camila","Matías","Lucía","Nicolás","Sofía",
  "Diego","Isabella","Andrés","Martina","Felipe","Valeria","Joaquín","Catalina",
  "Rodrigo","Gabriela","Carlos","Florencia","Pablo","Natalia","Tomás","Paula",
  "Fernando","Carolina","Miguel","Ana","Ricardo","Laura","Eduardo","Patricia",
  "Gustavo","Mercedes","Hernán","Claudia","Roberto","Elena","Marcelo","Sandra",
  "Cristian","Daniela","Emilio","Verónica","Santiago","Andrea","Iván","Monica",
  "Rafael","Jimena","Xavier","Paola","Agustín","Beatriz","Leandro","Rocío",
  "Mario","Fernanda","Ramiro","Silvia","César","Eugenia","Patricio","Lorena",
  "Ignacio","Carla","Bruno","Noelia","Facundo","Yanina","Gonzalo","Pilar",
  "Leonardo","Romina","Ezequiel","Micaela","Mauro","Renata","Damián","Soledad",
  "Brian","Antonella","Kevin","Estefanía","Lucas","Aldana","Maximiliano","Cecilia",
  "Ariel","Melina","Franco","Vanesa","Nahuel","Brenda","Elías","Nadia",
];

const LAST_NAMES = [
  "García","Rodríguez","López","Martínez","González","Pérez","Sánchez","Ramírez",
  "Torres","Flores","Rivera","Gómez","Díaz","Cruz","Morales","Reyes",
  "Herrera","Jiménez","Mendoza","Vargas","Castro","Ortiz","Ramos","Moreno",
  "Rojas","Núñez","Álvarez","Muñoz","Romero","Alvarado","Gutiérrez","Chávez",
  "Ríos","Vásquez","Medina","Castillo","Fernández","Aguilar","Navarro","Cortés",
  "Suárez","Delgado","Serrano","Vera","Bravo","Peña","Ruiz","Molina",
  "Cabrera","Acosta","Lara","Soto","Salinas","Ibáñez","Fuentes","Cárdenas",
  "Arias","Espinoza","Méndez","Ponce","Figueroa","Vega","Palacios","León",
];

const COMPANIES_BY_INDUSTRY = {
  "SaaS / Software": [
    "NexaTech","CloudCore","DataFlow Systems","SyncSoft","PlatformOne","DevStack",
    "AutomateIQ","CodeBridge","SaaSify","TechStream","AppForge","ScaleUp Labs",
    "BuildFast","DeployNow","CloudPeak","IterateX","ReleaseHQ","PipelineAI",
  ],
  "Fintech": [
    "PayLoop","CreditNexus","FinEdge","MoneyStream","VaultPay","TrustLedger",
    "ClearFunds","QuickSettle","CapitalRoute","FintechHub","PayBridge","LoanFlow",
    "InvestPath","WealthSync","OpenBanking Co","RemitGo","Pagoflex","Cobros360",
  ],
  "HealthTech": [
    "MedSync","HealthBridge","CareFlow","CliniqAI","PatientHub","MediConnect",
    "VitalTrack","HealthLoop","DocuCare","SaludTech","BioFlow","ClínicaDigital",
  ],
  "E-commerce / Retail": [
    "ShopStream","CartMax","RetailEdge","OrderFlow","Mercado Élite","CommerceIQ",
    "StoreBoost","SellFast","MarketNest","TiendaPro","EcomHub","LogiShop",
  ],
  "EdTech": [
    "LearnPath","EduStream","SkillBridge","TrainIQ","AcademiX","KnowledgeHub",
    "CourseFlow","LearnLoop","EduForge","CapacitaYa","TalentoNet","MentorAI",
  ],
  "Logística / Supply Chain": [
    "LogiFlow","ShipSmart","FreightBridge","RouteMaster","CargoSync","DeliverIQ",
    "TrackNow","SupplyEdge","FleetCore","TruckStack","RouteMax","Logística360",
  ],
  "Real Estate / PropTech": [
    "PropSync","RealEdge","HouseFlow","BuildIQ","PropertyHub","EstateStream",
    "InmoDigital","RentSmart","DevProp","UrbanCore","SpaceConnect","PropMax",
  ],
  "Manufactura / Industrial": [
    "FabriFlow","IndustrIQ","MachineSync","FactoryEdge","ProductionHub","ManufaCore",
    "AutoFab","PlantConnect","IndustriaX","ProcessMax","Metalúrgica Andes","FabriTech",
  ],
  "Marketing / Agencias": [
    "GrowthStack","BrandFlow","MarketIQ","CampaignSync","AdEdge","ContentBridge",
    "DigitalBoost","LeadStream","ConvertMax","AgenciaX","GrowthHQ","BrandCore",
  ],
  "Consulting / Servicios": [
    "StratEdge","ConsultIQ","AdvisoryHub","ServiceFlow","PrimeConsult","BizBridge",
    "InsightCore","SolutionStack","ExpertPath","ConsultMax","AsesoresX","PremiumAdvisory",
  ],
};

const COUNTRIES = [
  { country: "Argentina", cities: ["Buenos Aires","Córdoba","Rosario","Mendoza","La Plata","Mar del Plata"] },
  { country: "Chile", cities: ["Santiago","Valparaíso","Concepción","Viña del Mar","Temuco","Antofagasta"] },
  { country: "México", cities: ["Ciudad de México","Guadalajara","Monterrey","Puebla","Tijuana","Querétaro"] },
  { country: "Colombia", cities: ["Bogotá","Medellín","Cali","Barranquilla","Bucaramanga","Cartagena"] },
  { country: "España", cities: ["Madrid","Barcelona","Valencia","Sevilla","Bilbao","Málaga"] },
  { country: "Brasil", cities: ["São Paulo","Rio de Janeiro","Belo Horizonte","Brasília","Curitiba","Porto Alegre"] },
  { country: "Uruguay", cities: ["Montevideo","Maldonado","Punta del Este","Salto","Rivera"] },
  { country: "Perú", cities: ["Lima","Arequipa","Trujillo","Cusco","Piura"] },
  { country: "Ecuador", cities: ["Quito","Guayaquil","Cuenca","Manta","Ambato"] },
  { country: "Costa Rica", cities: ["San José","Alajuela","Heredia","Cartago"] },
  { country: "United States", cities: ["New York","San Francisco","Miami","Austin","Boston","Seattle"] },
  { country: "Germany", cities: ["Berlin","Munich","Hamburg","Frankfurt","Cologne"] },
];

const JOB_TITLES = [
  "CEO & Co-founder","CTO","COO","CFO","CMO","CPO",
  "VP of Sales","VP of Marketing","VP of Engineering","VP of Product","VP of Operations",
  "Head of Sales","Head of Marketing","Head of Product","Head of Engineering","Head of Customer Success",
  "Director of Sales","Director of Marketing","Director of Operations","Director of Technology",
  "Sales Manager","Marketing Manager","Product Manager","Engineering Manager","Operations Manager",
  "Account Executive","Senior Account Executive","Enterprise Account Executive",
  "Business Development Manager","Partnership Manager","Customer Success Manager",
  "Growth Manager","Revenue Operations Manager","SDR Manager","Inside Sales Manager",
  "Founder","Co-founder","Managing Director","General Manager","Country Manager",
  "Chief Revenue Officer","Chief Customer Officer","Chief Growth Officer",
];

const BUYING_ROLES = ["DECISION_MAKER","INFLUENCER","BLOCKER","BUDGET_HOLDER","END_USER","CHAMPION"];
const SOURCES = ["ORGANIC_SEARCH","PAID_SEARCH","REFERRALS","SOCIAL_MEDIA","EMAIL_MARKETING","DIRECT_TRAFFIC","EVENT","PARTNER"];

const COMPETITORS = [
  "Salesforce","HubSpot","Pipedrive","Zoho CRM","Microsoft Dynamics","SAP",
  "Monday.com","Freshsales","Copper","Close","Nutshell","ActiveCampaign",
];

// ─── Note templates (the richest field for AI) ───────────────────────────────

function randomCompetitor(exclude = []) {
  const available = COMPETITORS.filter(c => !exclude.includes(c));
  return available[Math.floor(Math.random() * available.length)];
}

const NOTE_TEMPLATES = {
  customer_won: [
    (c1) => `Deal cerrado en ${rnd(["marzo","abril","mayo","febrero"])} tras ${rnd([3,4,5,6])} meses de ciclo de venta. El cliente eligió nuestra solución sobre ${c1} (${"2x"} más caro según ellos). Champion interno: ${rndName()}. Integración completada, soporte activo. Expansión a otras áreas prevista para Q3. NPS post-implementación: 9/10.`,
    (c1) => `Ganamos vs ${c1} por nuestra integración nativa con HubSpot y soporte en español. Presupuesto final: $${rnd([1800,2400,3200,4500,6000,8000])}/mes. Decision maker fue el CFO tras ver el ROI proyectado. Onboarding completado en 2 semanas. Referral potencial a ${rnd(["su red de inversores","su aceleradora","sus socios estratégicos"])}.`,
    (c1, c2) => `Proceso de evaluación de ${rnd([8,10,12,16])} semanas contra ${c1} y ${c2}. Ganamos en criteria de: facilidad de uso, precio y soporte regional. Contrato firmado por 12 meses con opción de expansión. POC exitoso en Q1. Testimonial acordado para publicar en Q2.`,
    () => `Cliente desde hace ${rnd([6,8,10,14])} meses. Renovó en ${rnd(["enero","febrero","marzo"])} con ${rnd([15,20,25])}% de incremento. Usa intensivamente el módulo de pipeline y reportes. Solicitó feature de forecasting — en roadmap Q3. Potencial upsell a Enterprise: $${rnd([12000,15000,18000])}/año.`,
    (c1) => `Llegó como referral de ${rndCompany()}. Evaluó ${c1} primero pero optó por nosotros por la implementación más rápida. Go-live en ${rnd(["2 semanas","3 semanas","10 días"])}. Equipo de ${rnd([8,12,15,20])} usuarios. Próximo QBR agendado para ${rnd(["junio","julio","agosto"])}.`,
  ],
  lost: [
    (c1) => `Perdimos vs ${c1}. El factor decisivo fue el precio — ofrecieron ${rnd([30,40,50])}% de descuento en el primer año. Nuestro diferenciador de soporte en español no fue suficiente para el equipo técnico que ya conocía ${c1}. Revisitar en 12 meses cuando expire su contrato.`,
    (c1) => `Deal perdido por timing. La empresa pasó por una reestructuración y congelaron todos los proyectos de tecnología hasta Q4. Evaluaron ${c1} también. Quedamos como segunda opción. Follow-up agendado para ${rnd(["octubre","noviembre","diciembre"])}.`,
    (c1, c2) => `Evaluación de ${rnd([6,8,10])} semanas. Shortlist final con ${c1} y ${c2}. Eligieron ${c1} por integración nativa con su ERP existente. Precio no fue el factor determinante. Good prospect para revisitar si cambian de ERP.`,
    () => `Sin presupuesto aprobado para este año. La iniciativa fue bajada de prioridad por el board después del Q2. Contact dice que van a retomar en Q1 del próximo año. Buena relación establecida — nurture con content mensual.`,
    (c1) => `El champion interno (${rndName()}) fue desvinculado. El nuevo responsable tiene relación previa con ${c1}. Difícil revertir sin un cambio en la dirección. Monitorear LinkedIn del contacto.`,
  ],
  opportunity_hot: [
    (c1) => `Demo realizada la semana pasada, excelente feedback del equipo técnico. Están evaluando también ${c1} pero nuestro soporte en español es un diferenciador clave. Presupuesto confirmado: $${rnd([2000,3000,4000,5000])}/mes. Decision esperada para fin de mes. POC solicitado. Champion: ${rndName()}, Head of Operations.`,
    (c1, c2) => `Segunda demo con el equipo ejecutivo. Shortlist: nosotros vs ${c1} vs ${c2}. Nos piden propuesta formal esta semana. Budget owner es el CFO. Han usado ${c1} antes y están insatisfechos con el soporte. Cierre estimado: ${rnd(["15/06","30/06","15/07"])}. Contrato potencial: $${rnd([4000,6000,8000,10000])}/mes.`,
    () => `Trial activo hace ${rnd([2,3])} semanas. El equipo ya cargó ${rnd([150,200,300])} contactos y está usando el módulo de AI insights a diario. NPS del trial: 8/10. Reunión de cierre agendada. Objeción principal: integración con su CRM legacy (resoluble con API). Potencial: $${rnd([3500,5000,7000])}/mes.`,
    (c1) => `Referral calificado de ${rndCompany()}. Ya conocen la plataforma por el caso de su red. Proceso acelerado — saltean el trial. Evaluando propuesta vs ${c1}. Decision maker confirmado: CEO. Timeline: 2 semanas. Deal size esperado: $${rnd([5000,8000,12000])}/mes.`,
  ],
  opportunity_stalled: [
    (c1) => `Última actividad hace ${rnd([25,35,40])} días. Demo fue positiva pero no avanzamos. Posible causa: cambio de prioridades interno. Están también mirando ${c1}. Intentos de contacto: ${rnd([2,3])} emails + ${rnd([1,2])} llamadas sin respuesta. Recomendación: contenido de valor o cambiar de contacto.`,
    () => `Trial expiró hace ${rnd([2,3])} semanas sin decisión. El champion interno está de vacaciones según LinkedIn. Equipo de IT levantó objeciones sobre seguridad (respondidas en email). Necesita empuje del decision maker (CFO). Last resort: oferta de extensión de trial 2 semanas.`,
  ],
  sql_active: [
    (c1) => `Calificado BANT: presupuesto confirmado ($${rnd([1500,2500,3500])}/mes), autoridad (VP Sales), necesidad (reemplazar ${c1}), timeline (Q${rnd([2,3])} de este año). Primera demo agendada para la próxima semana. Fuente: conferencia ${rnd(["SaaStr","LatamConf","HubSpot Impact","B2B Summit"])}.`,
    () => `Inbound desde blog post sobre "automatización de pipeline". Score alto: visitó pricing 3 veces, descargó caso de estudio, respondió 2 emails de nurture. Empresa de ${rnd([50,100,200,500])} empleados, ${rnd(["SaaS","Fintech","E-commerce"])}. Ideal customer profile exacto. Conectar con VP Sales.`,
    (c1) => `Referral del cliente ${rndCompany()}. Ya saben del producto, quieren ver la integración con ${rnd(["Slack","Notion","Intercom","Zendesk","Jira"])}. Presupuesto no confirmado aún pero empresa factura ~$${rnd([5,10,20])}M/año. Alta probabilidad de conversión si demostramos ROI en primera llamada.`,
  ],
  mql: [
    () => `Descargó whitepaper "State of B2B Sales 2025". Score: ${rnd([65,70,75,80])}/100. Empresa en ICP. ${rnd([2,3,4])} visitas al sitio esta semana. No ha visto pricing aún. Candidato para secuencia de nurture con caso de éxito en su industria.`,
    () => `Attendee del webinar "AI en ventas B2B". Participó activamente (${rnd([3,4,5])} preguntas). LinkedIn muestra que está evaluando herramientas CRM. Empresa de ${rnd([30,50,80,150])} empleados. Trigger: nuevo rol asumido hace ${rnd([1,2,3])} meses.`,
    (c1) => `Llegó por búsqueda orgánica "${c1} alternativa". Comparó features en nuestro site ${rnd([10,15,20])} min. No completó el trial form. Retargeting activo. Potencial: redirigirle caso de éxito de empresa similar en su industria.`,
  ],
  new_lead: [
    () => `Suscrito al newsletter desde LinkedIn ad. Empresa visible en LinkedIn: ${rnd([20,50,100])} empleados, fundada en ${rnd([2019,2020,2021,2022])}. Sin actividad en el site todavía. Secuencia de welcome en curso.`,
    () => `Formulario de contacto completado: "Quiero saber más sobre automatización de pipeline". Sin información adicional. Primer email enviado hace ${rnd([1,2,3,5])} días sin respuesta. Follow-up programado.`,
  ],
};

function rnd(arr) {
  if (!Array.isArray(arr)) return arr;
  return arr[Math.floor(Math.random() * arr.length)];
}
function rndName() {
  return `${rnd(FIRST_NAMES)} ${rnd(LAST_NAMES)}`;
}
function rndCompany() {
  const industry = rnd(Object.keys(COMPANIES_BY_INDUSTRY));
  return rnd(COMPANIES_BY_INDUSTRY[industry]);
}
function rndNote(stage, leadStatus) {
  const c1 = randomCompetitor();
  const c2 = randomCompetitor([c1]);
  if (stage === "customer") return rnd(NOTE_TEMPLATES.customer_won)(c1, c2);
  if (leadStatus === "UNQUALIFIED" || leadStatus === "BAD_TIMING") return rnd(NOTE_TEMPLATES.lost)(c1, c2);
  if (stage === "opportunity" && leadStatus === "OPEN_DEAL") return rnd(NOTE_TEMPLATES.opportunity_hot)(c1, c2);
  if (stage === "opportunity") return rnd(NOTE_TEMPLATES.opportunity_stalled)(c1, c2);
  if (stage === "salesqualifiedlead") return rnd(NOTE_TEMPLATES.sql_active)(c1);
  if (stage === "marketingqualifiedlead") return rnd(NOTE_TEMPLATES.mql)(c1);
  if (leadStatus === "NEW") return rnd(NOTE_TEMPLATES.new_lead)();
  return null;
}

// ─── Distribution plan (287 contacts) ────────────────────────────────────────
const PLAN = [
  // [lifecycle_stage, lead_status, count, has_note_probability]
  ["customer",              "OPEN_DEAL",             12, 1.0],
  ["customer",              "IN_PROGRESS",            8, 0.9],
  ["customer",              null,                    35, 0.7],
  ["opportunity",           "OPEN_DEAL",             28, 1.0],
  ["opportunity",           "IN_PROGRESS",           20, 0.9],
  ["opportunity",           "ATTEMPTED_TO_CONTACT",  12, 0.8],
  ["opportunity",           "CONNECTED",             15, 0.5],
  ["salesqualifiedlead",    "IN_PROGRESS",           22, 1.0],
  ["salesqualifiedlead",    "OPEN",                  18, 0.8],
  ["salesqualifiedlead",    "CONNECTED",             15, 0.6],
  ["salesqualifiedlead",    "ATTEMPTED_TO_CONTACT",  10, 0.7],
  ["marketingqualifiedlead","NEW",                   18, 0.4],
  ["marketingqualifiedlead","OPEN",                  15, 0.3],
  ["marketingqualifiedlead","IN_PROGRESS",           12, 0.5],
  ["lead",                  "NEW",                   15, 0.2],
  ["lead",                  "ATTEMPTED_TO_CONTACT",   8, 0.4],
  ["lead",                  "BAD_TIMING",             7, 1.0],
  ["lead",                  "UNQUALIFIED",            6, 1.0],
  ["subscriber",            "NEW",                   11, 0.1],
  ["salesqualifiedlead",    "UNQUALIFIED",            9, 1.0],
  ["opportunity",           "BAD_TIMING",            10, 1.0],
];

// ─── Generator ───────────────────────────────────────────────────────────────

const usedEmails = new Set();

function makeContact(stage, leadStatus) {
  const firstName = rnd(FIRST_NAMES);
  const lastName = rnd(LAST_NAMES);
  const industry = rnd(Object.keys(COMPANIES_BY_INDUSTRY));
  const companyName = rnd(COMPANIES_BY_INDUSTRY[industry]);
  const location = rnd(COUNTRIES);
  const city = rnd(location.cities);
  const jobTitle = rnd(JOB_TITLES);

  const emailDomain = companyName.toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 20);
  const emailUser = `${firstName.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")}.${lastName.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").slice(0, 8)}`;
  let email = `${emailUser}@${emailDomain}.${rnd(["com","io","co","tech","app"])}`;
  // Ensure uniqueness
  let suffix = 1;
  while (usedEmails.has(email)) {
    email = `${emailUser}${suffix}@${emailDomain}.${rnd(["com","io","co"])}`;
    suffix++;
  }
  usedEmails.add(email);

  const employees = rnd(["10-25","25-50","50-100","100-250","250-500","500-1000","1000+"]);
  const revenue = rnd([null, "500000","1000000","2500000","5000000","10000000","25000000","50000000"]);
  const buyingRole = Math.random() > 0.4 ? rnd(BUYING_ROLES) : null;
  const source = rnd(SOURCES);

  const noteProb = leadStatus === "UNQUALIFIED" || leadStatus === "BAD_TIMING" || stage === "customer" || stage === "opportunity" ? 0.95 : 0.4;
  const note = Math.random() < noteProb ? rndNote(stage, leadStatus) : null;

  const contact = {
    firstname: firstName,
    lastname: lastName,
    email,
    phone: `+${rnd([54,56,52,57,34,55,598,51,593,506,1,49])}${Math.floor(Math.random() * 9000000000 + 1000000000)}`.slice(0, 15),
    company: companyName,
    jobtitle: jobTitle,
    lifecyclestage: stage,
    country: location.country,
    city,
    industry,
    numemployees: employees,
    hs_analytics_source: source,
  };

  if (leadStatus) contact.hs_lead_status = leadStatus;
  if (revenue) contact.annualrevenue = revenue;
  if (buyingRole) contact.hs_buying_role = buyingRole;
  if (note) contact.message = note;
  if (Math.random() > 0.6) {
    contact.website = `https://www.${emailDomain}.${rnd(["com","io","co"])}`;
  }

  return contact;
}

// ─── Build contacts array ─────────────────────────────────────────────────────

const contacts = [];
for (const [stage, leadStatus, count] of PLAN) {
  for (let i = 0; i < count; i++) {
    contacts.push(makeContact(stage, leadStatus));
  }
}

// Shuffle so stages aren't grouped
for (let i = contacts.length - 1; i > 0; i--) {
  const j = Math.floor(Math.random() * (i + 1));
  [contacts[i], contacts[j]] = [contacts[j], contacts[i]];
}

console.log(`Generated ${contacts.length} contacts`);
console.log(`With notes: ${contacts.filter(c => c.message).length}`);
const stageCounts = {};
contacts.forEach(c => { stageCounts[c.lifecyclestage] = (stageCounts[c.lifecyclestage] || 0) + 1; });
console.log("By stage:", stageCounts);

const outPath = join(__dirname, "seed-data-v4.json");
writeFileSync(outPath, JSON.stringify(contacts, null, 2), "utf8");
console.log(`Saved to ${outPath}`);

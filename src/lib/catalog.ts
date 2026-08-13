/**
 * Catálogo de productos — fuente única de verdad.
 *
 * Todos los precios viven aquí en centavos para evitar errores de redondeo.
 * La landing, el carrito, el checkout y las server functions leen de este
 * archivo, así que cambiar un precio acá lo cambia en toda la app.
 */

import c1 from "@/assets/c1.jpg.asset.json";
import c2 from "@/assets/c2.jpg.asset.json";
import c3 from "@/assets/c3.jpg.asset.json";
import c4 from "@/assets/c4.jpg.asset.json";
import c5 from "@/assets/c5.jpg.asset.json";

export type CourseId =
  | "empresa-contenido"
  | "un-millon-seguidores"
  | "real-estate"
  | "inversiones"
  | "grabacion-edicion";

export const BUNDLE_ID = "bundle-completo" as const;

export type ProductId = CourseId | typeof BUNDLE_ID;

export type Course = {
  id: CourseId;
  /** Número mostrado en la landing ("01" … "05"). */
  n: string;
  /** Título largo, usado en el reel de cursos y en el carrito. */
  title: string;
  /** Título corto para listas densas. */
  short: string;
  /** Título de la tarjeta individual (con salto de línea manual). */
  cardTitle: string;
  /** Etiqueta de sección en el programa académico. */
  eyebrow: string;
  /** Descripción larga (programa académico). */
  desc: string;
  /** Descripción corta (tarjeta individual y carrito). */
  shortDesc: string;
  priceCents: number;
  thumb: string;
};

export const COURSES: Course[] = [
  {
    id: "empresa-contenido",
    n: "01",
    title: "¿Cómo crear una empresa de contenido?",
    short: "Cómo crear una empresa de contenido",
    cardTitle: "Cómo crear una\nempresa de contenido",
    eyebrow: "Fundación del sistema",
    desc: "Del modelo de negocio a la operación real. Estructura, monetización y escala.",
    shortDesc: "Estructura, monetización y escala.",
    priceCents: 19700,
    thumb: c1.url,
  },
  {
    id: "un-millon-seguidores",
    n: "02",
    title: "De 0 a 1 millón de seguidores",
    short: "De 0 a 1 millón de seguidores",
    cardTitle: "Cómo crecer\nen redes",
    eyebrow: "Redes sociales",
    desc: "La estrategia exacta de crecimiento. Cómo construir audiencia y convertirla en ingreso.",
    shortDesc: "Cómo construir audiencia y convertirla en ingreso.",
    priceCents: 29700,
    thumb: c2.url,
  },
  {
    id: "real-estate",
    n: "03",
    title: "Invierte en bienes raíces",
    short: "Real Estate",
    cardTitle: "Escuela de\nReal Estate",
    eyebrow: "Activos reales",
    desc: "Cómo invertir en bienes raíces desde tus ingresos digitales. La estrategia que yo uso.",
    shortDesc: "Cómo invertir en bienes raíces desde tus ingresos digitales.",
    priceCents: 39700,
    thumb: c3.url,
  },
  {
    id: "inversiones",
    n: "04",
    title: "Portafolios y libertad financiera",
    short: "Inversiones",
    cardTitle: "Escuela de\nInversiones",
    eyebrow: "Finanzas",
    desc: "Portafolios, estrategias y el camino hacia la libertad financiera real. Sin teoría vacía.",
    shortDesc: "Portafolios, estrategias y el camino hacia la libertad financiera.",
    priceCents: 24700,
    thumb: c4.url,
  },
  {
    id: "grabacion-edicion",
    n: "05",
    title: "Produce contenido profesional",
    short: "Grabación y edición básica",
    cardTitle: "Grabación y\nEdición (Básico)",
    eyebrow: "Bonus incluido",
    desc: "Todo lo que necesitas para producir contenido profesional desde el primer día.",
    shortDesc: "Producir contenido profesional desde el primer día.",
    priceCents: 19700,
    thumb: c5.url,
  },
];

/** Suma de los 5 cursos comprados por separado: $1,335. */
export const CATALOG_VALUE_CENTS = COURSES.reduce((sum, c) => sum + c.priceCents, 0);

/** Precio del bundle completo: $497. */
export const BUNDLE_PRICE_CENTS = 49700;

/** Número de cuotas del downsell. */
export const INSTALLMENT_COUNT = 3;

export const BUNDLE = {
  id: BUNDLE_ID,
  title: "Bundle completo — los 5 cursos",
  short: "Bundle completo",
  desc: "Acceso total a los 5 cursos, comunidad y actualizaciones para siempre.",
  priceCents: BUNDLE_PRICE_CENTS,
  listPriceCents: CATALOG_VALUE_CENTS,
  perks: [
    "Los 5 cursos completos en video",
    "Comunidad privada + sesiones mensuales",
    "Actualizaciones para siempre",
    "Acceso inmediato, de por vida",
  ],
} as const;

/* ------------------------------------------------------------------ lookups */

const COURSE_BY_ID = new Map(COURSES.map((c) => [c.id, c]));

export function getCourse(id: string): Course | undefined {
  return COURSE_BY_ID.get(id as CourseId);
}

export function isCourseId(id: string): id is CourseId {
  return COURSE_BY_ID.has(id as CourseId);
}

export type Product = {
  id: ProductId;
  title: string;
  short: string;
  desc: string;
  priceCents: number;
  thumb?: string;
};

export function getProduct(id: string): Product | undefined {
  if (id === BUNDLE_ID) {
    return {
      id: BUNDLE_ID,
      title: BUNDLE.title,
      short: BUNDLE.short,
      desc: BUNDLE.desc,
      priceCents: BUNDLE.priceCents,
    };
  }
  const course = getCourse(id);
  if (!course) return undefined;
  return {
    id: course.id,
    title: course.title,
    short: course.short,
    desc: course.shortDesc,
    priceCents: course.priceCents,
    thumb: course.thumb,
  };
}

/* -------------------------------------------------------------------- money */

/** Formatea centavos como USD, omitiendo los decimales cuando son .00 */
export function formatUSD(cents: number): string {
  const dollars = cents / 100;
  const hasDecimals = Math.round(cents) % 100 !== 0;
  return `$${dollars.toLocaleString("en-US", {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Reparte un total en N cuotas que suman exactamente el total.
 * El resto de la división se carga a las primeras cuotas, así que
 * $497 en 3 queda [$165.67, $165.67, $165.66] y no $497.01.
 */
export function splitInstallments(totalCents: number, count = INSTALLMENT_COUNT): number[] {
  const base = Math.floor(totalCents / count);
  const remainder = totalCents - base * count;
  return Array.from({ length: count }, (_, i) => (i < remainder ? base + 1 : base));
}

/* ------------------------------------------------------------------- upsell */

export type BundleUpgrade = {
  /** Cursos que le faltan para completar el bundle. */
  missingCourses: Course[];
  /** Lo que ya pagó por el curso suelto y se le acredita. */
  creditCents: number;
  /** Lo que le falta pagar para llevarse el bundle completo. */
  upgradeCostCents: number;
  /** Ahorro contra comprar esos cursos faltantes por separado. */
  savingsCents: number;
  /** Descuento equivalente sobre el precio de los cursos faltantes (0–100). */
  discountPercent: number;
  /** Valor de lista de los cursos que le faltan. */
  missingValueCents: number;
};

/**
 * Upgrade con crédito: lo que ya pagó por el curso suelto se le descuenta del
 * precio del bundle, así que solo abona la diferencia hasta $497.
 *
 * Es la base tanto del Order Bump del checkout como de las ofertas post-compra.
 */
export function calcUpgrade(courseId: string): BundleUpgrade {
  const owned = getCourse(courseId);
  const missingCourses = owned ? COURSES.filter((c) => c.id !== owned.id) : COURSES;

  const creditCents = owned?.priceCents ?? 0;
  const upgradeCostCents = Math.max(0, BUNDLE_PRICE_CENTS - creditCents);
  const missingValueCents = missingCourses.reduce((sum, c) => sum + c.priceCents, 0);
  const savingsCents = Math.max(0, missingValueCents - upgradeCostCents);
  const discountPercent =
    missingValueCents > 0 ? Math.round((savingsCents / missingValueCents) * 100) : 0;

  return {
    missingCourses,
    creditCents,
    upgradeCostCents,
    savingsCents,
    discountPercent,
    missingValueCents,
  };
}

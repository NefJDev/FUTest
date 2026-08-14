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
import francisco from "@/assets/francisco.jpg.asset.json";

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
  /**
   * Precio especial cuando el curso se ofrece como Order Bump dentro del
   * checkout de otro curso. En Kajabi es el precio que se le pone al bump.
   */
  bumpPriceCents: number;
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
    bumpPriceCents: 9700,
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
    bumpPriceCents: 14700,
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
    bumpPriceCents: 19700,
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
    bumpPriceCents: 12700,
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
    bumpPriceCents: 9700,
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
  /**
   * Vale como titular del checkout y también como concepto en el resumen y en
   * el recibo de la página de gracias: los tres leen de aquí.
   */
  title: "Buena decisión — Elegiste el bundle completo",
  short: "Bundle completo",
  desc: "Acceso total a los 5 cursos, comunidad y actualizaciones para siempre.",
  priceCents: BUNDLE_PRICE_CENTS,
  listPriceCents: CATALOG_VALUE_CENTS,
  /**
   * Imagen de la Offer. En Kajabi cada Offer sube una sola imagen, así que el
   * bundle usa la foto de Francisco en vez de un collage de los 5 cursos —
   * que además ya aparecen listados con su miniatura dentro del checkout.
   */
  thumb: francisco.url,
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

/**
 * Antepone el correlativo al título: "Curso 01 — De 0 a 1 millón de seguidores".
 *
 * El número sale de `n`, el mismo que numera los cursos en la landing, así que
 * el comprador ve la misma referencia en los dos sitios. El bundle no tiene
 * correlativo: se devuelve su título tal cual.
 */
export function withCourseNumber(id: string, title: string): string {
  const course = getCourse(id);
  return course ? `Curso ${course.n} — ${title}` : title;
}

export type Product = {
  id: ProductId;
  title: string;
  short: string;
  desc: string;
  priceCents: number;
  thumb: string;
};

export function getProduct(id: string): Product | undefined {
  if (id === BUNDLE_ID) {
    return {
      id: BUNDLE_ID,
      title: BUNDLE.title,
      short: BUNDLE.short,
      desc: BUNDLE.desc,
      priceCents: BUNDLE.priceCents,
      thumb: BUNDLE.thumb,
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

/**
 * Importe con 2 decimales y sin símbolo: "197.00".
 * Es como Kajabi muestra los precios en el checkout ("USD 45.00").
 */
export function formatAmount(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

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

/* --------------------------------------------------------- venta cruzada */

/**
 * Curso complementario que se ofrece dentro del checkout de cada curso.
 *
 * No es un algoritmo: es un emparejamiento decidido a mano, tema por tema.
 * En Kajabi esto se configura como un Order Bump dentro de la Offer de cada
 * curso, así que hay que cargar estos 5 pares uno por uno. El resultado para
 * el comprador es idéntico al de una recomendación "inteligente".
 */
export const PAIRINGS: Record<CourseId, { with: CourseId; reason: string }> = {
  "empresa-contenido": {
    with: "grabacion-edicion",
    reason:
      "Vas a montar tu empresa de contenido. Para sostenerla necesitas grabar y editar tú mismo, sin depender de nadie ni pagar producción.",
  },
  "un-millon-seguidores": {
    with: "empresa-contenido",
    reason:
      "Vas a construir la audiencia. Este te enseña a convertirla en una empresa que factura todos los meses, no solo en seguidores.",
  },
  "real-estate": {
    with: "un-millon-seguidores",
    reason:
      "Para comprar tu primera propiedad primero hay que generar el capital. La audiencia es lo que financia la entrada.",
  },
  inversiones: {
    with: "real-estate",
    reason:
      "Ya vas a saber armar tu portafolio. El siguiente paso natural son los activos reales: es la estrategia que yo uso.",
  },
  "grabacion-edicion": {
    with: "empresa-contenido",
    reason:
      "Ya vas a saber producir. Ahora convierte esa habilidad en un negocio con estructura, clientes y precios.",
  },
};

export type PairedOffer = {
  course: Course;
  reason: string;
  /** Precio del curso dentro del bump. */
  priceCents: number;
  /** Precio de lista, para tacharlo. */
  listPriceCents: number;
  discountPercent: number;
};

/** Devuelve el curso complementario que se ofrece junto a `courseId`. */
export function getPairedOffer(courseId: string): PairedOffer | null {
  const base = getCourse(courseId);
  if (!base) return null;

  const pairing = PAIRINGS[base.id];
  const course = getCourse(pairing.with);
  if (!course) return null;

  return {
    course,
    reason: pairing.reason,
    priceCents: course.bumpPriceCents,
    listPriceCents: course.priceCents,
    discountPercent: Math.round(
      ((course.priceCents - course.bumpPriceCents) / course.priceCents) * 100,
    ),
  };
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

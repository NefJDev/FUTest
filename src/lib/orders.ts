/**
 * Capa de órdenes — corre como función serverless en Vercel.
 *
 * Modela el pipeline de Kajabi tal cual funciona:
 *   1. `submitCheckout` — la compra principal. Si marcó el Order Bump, el
 *      producto extra entra como una línea más de la misma transacción.
 *   2. `submitUpsell`  — la oferta post-compra (upsell o downsell). En Kajabi
 *      es una transacción SEPARADA cobrada a la tarjeta que ya quedó guardada,
 *      por eso acá también devuelve su propia orden en vez de mutar la primera.
 *
 * IMPORTANTE: es una simulación. No se cobra nada, no hay pasarela de pago y
 * el número de tarjeta nunca sale del navegador: el cliente valida el formato
 * con Luhn y solo envía los últimos 4 dígitos y la marca.
 *
 * Lo que sí es real es la lógica de negocio: el servidor recalcula todos los
 * precios contra el catálogo en vez de confiar en los totales que manda el
 * navegador, que es exactamente como debe hacerse con una pasarela de verdad.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
  BUNDLE,
  BUNDLE_ID,
  BUNDLE_PRICE_CENTS,
  INSTALLMENT_COUNT,
  calcUpgrade,
  formatUSD,
  getCourse,
  getProduct,
  splitInstallments,
} from "./catalog";

/* --------------------------------------------------------------- validación */

const customerSchema = z.object({
  name: z.string().trim().min(2, "Ingresa tu nombre completo").max(120),
  email: z.string().trim().toLowerCase().email("Ingresa un email válido").max(160),
});

const cardSchema = z.object({
  brand: z.string().min(1).max(20),
  last4: z.string().regex(/^\d{4}$/, "Tarjeta inválida"),
});

const checkoutSchema = z.object({
  /** Offer que se está comprando: un curso suelto o el bundle. */
  offer: z.string().min(1),
  /** Order Bump marcado (solo aplica a offers de un curso suelto). */
  bump: z.boolean(),
  paymentPlan: z.enum(["full", "x3"]),
  customer: customerSchema,
  card: cardSchema,
});

const upsellSchema = z.object({
  /** Curso que ya compró; de ahí sale el precio del upgrade. */
  baseOffer: z.string().min(1),
  paymentPlan: z.enum(["full", "x3"]),
  /** Qué paso del pipeline aceptó. */
  step: z.enum(["upsell", "downsell"]),
  customer: customerSchema,
  card: cardSchema,
});

export type CheckoutInput = z.input<typeof checkoutSchema>;
export type UpsellInput = z.input<typeof upsellSchema>;

/* ------------------------------------------------------------------ tipos */

export type OrderLine = {
  id: string;
  title: string;
  priceCents: number;
};

export type OrderInstallment = {
  n: number;
  amountCents: number;
  /**
   * Timestamp ISO completo, anclado al mismo instante que createdAt.
   * Guardar solo la fecha (YYYY-MM-DD) hacía que el navegador la interpretara
   * como medianoche UTC y mostrara un día distinto al de la orden.
   */
  dueDate: string;
  status: "cobrado" | "programado";
};

export type Order = {
  id: string;
  createdAt: string;
  /** "principal" es la compra del checkout; "upsell" es la oferta post-compra. */
  kind: "principal" | "upsell";
  customer: { name: string; email: string };
  card: { brand: string; last4: string };
  lines: OrderLine[];
  totalCents: number;
  paymentPlan: "full" | "x3";
  installments: OrderInstallment[];
  dueTodayCents: number;
};

/** Todo lo que pasó en el pipeline, guardado en sessionStorage. */
export type PurchaseSession = {
  main: Order;
  upsellOrder?: Order;
  /** Offer original del checkout, para calcular el upgrade después. */
  baseOffer: string;
  /** Ya tiene los 5 cursos (compró el bundle o aceptó el upgrade). */
  ownsBundle: boolean;
  pipeline: {
    bumpOffered: boolean;
    bumpTaken: boolean;
    upsellShown: boolean;
    upsellAccepted: boolean;
    downsellShown: boolean;
    downsellAccepted: boolean;
  };
};

export type OrderResult =
  | { ok: true; order: Order }
  | { ok: false; error: string; code: "card_declined" | "invalid_offer" };

/* --------------------------------------------------------------- helpers */

const ORDER_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateOrderId(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  const code = Array.from(bytes, (b) => ORDER_ALPHABET[b % ORDER_ALPHABET.length]).join("");
  return `FELRU-${code}`;
}

/**
 * Devuelve el mismo instante desplazado N días, como ISO completo.
 *
 * Al conservar la hora, la cuota 1 es exactamente createdAt y el navegador
 * formatea todas las fechas en la misma zona horaria: la fecha de la orden y
 * la del primer cobro nunca se contradicen, viva donde viva el comprador.
 */
function addDays(date: Date, days: number): string {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString();
}

/**
 * Tarjetas de prueba, siguiendo la convención de Stripe para que la demo se
 * sienta familiar: 4242 4242 4242 4242 aprueba, 4000 0000 0000 0002 rechaza.
 */
const DECLINED_LAST4 = new Set(["0002", "9995", "0069"]);

function buildOrder(opts: {
  kind: Order["kind"];
  customer: { name: string; email: string };
  card: { brand: string; last4: string };
  lines: OrderLine[];
  paymentPlan: "full" | "x3";
}): Order {
  const now = new Date();
  const totalCents = opts.lines.reduce((sum, line) => sum + line.priceCents, 0);
  const amounts =
    opts.paymentPlan === "x3" ? splitInstallments(totalCents, INSTALLMENT_COUNT) : [totalCents];

  const installments: OrderInstallment[] = amounts.map((amountCents, i) => ({
    n: i + 1,
    amountCents,
    dueDate: addDays(now, i * 30),
    status: i === 0 ? "cobrado" : "programado",
  }));

  return {
    id: generateOrderId(),
    createdAt: now.toISOString(),
    kind: opts.kind,
    customer: opts.customer,
    card: opts.card,
    lines: opts.lines,
    totalCents,
    paymentPlan: opts.paymentPlan,
    installments,
    dueTodayCents: installments[0]?.amountCents ?? 0,
  };
}

/** Latencia simulada para que el estado "procesando pago" se vea en la demo. */
const fakeGatewayDelay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/* ------------------------------------------------- compra principal */

export const submitCheckout = createServerFn({ method: "POST" })
  .inputValidator((data: CheckoutInput) => checkoutSchema.parse(data))
  .handler(async ({ data }): Promise<OrderResult> => {
    // Los precios se recalculan acá contra el catálogo del servidor. Nunca se
    // confía en el total que manda el navegador.
    const product = getProduct(data.offer);
    if (!product) {
      return { ok: false, code: "invalid_offer", error: `Offer desconocida: ${data.offer}` };
    }

    const isBundle = product.id === BUNDLE_ID;
    const lines: OrderLine[] = [
      { id: product.id, title: product.title, priceCents: product.priceCents },
    ];

    // Order Bump: solo existe sobre un curso suelto y agrega los que faltan
    // al precio que completa el bundle.
    if (data.bump) {
      if (isBundle) {
        return {
          ok: false,
          code: "invalid_offer",
          error: "El bundle completo no admite Order Bump.",
        };
      }
      const upgrade = calcUpgrade(product.id);
      lines.push({
        id: "upgrade-bundle",
        title: `Los otros ${upgrade.missingCourses.length} cursos del bundle`,
        priceCents: upgrade.upgradeCostCents,
      });
    }

    // El plan de 3 cuotas solo se ofrece sobre el bundle completo.
    const total = lines.reduce((sum, line) => sum + line.priceCents, 0);
    if (data.paymentPlan === "x3" && total !== BUNDLE_PRICE_CENTS) {
      return {
        ok: false,
        code: "invalid_offer",
        error: "El plan de 3 pagos solo aplica al bundle completo.",
      };
    }

    await fakeGatewayDelay(900);

    if (DECLINED_LAST4.has(data.card.last4)) {
      return {
        ok: false,
        code: "card_declined",
        error: "Tu banco rechazó el pago. Prueba con otra tarjeta.",
      };
    }

    return {
      ok: true,
      order: buildOrder({
        kind: "principal",
        customer: data.customer,
        card: data.card,
        lines,
        paymentPlan: data.paymentPlan,
      }),
    };
  });

/* ------------------------------------------- upsell / downsell post-compra */

export const submitUpsell = createServerFn({ method: "POST" })
  .inputValidator((data: UpsellInput) => upsellSchema.parse(data))
  .handler(async ({ data }): Promise<OrderResult> => {
    const course = getCourse(data.baseOffer);
    if (!course) {
      return {
        ok: false,
        code: "invalid_offer",
        error: "La oferta post-compra solo aplica sobre un curso suelto.",
      };
    }

    const upgrade = calcUpgrade(course.id);
    if (upgrade.upgradeCostCents <= 0) {
      return { ok: false, code: "invalid_offer", error: "No queda nada por agregar." };
    }

    // El downsell es el mismo upgrade, solo que repartido en cuotas.
    if (data.paymentPlan === "x3" && data.step !== "downsell") {
      return {
        ok: false,
        code: "invalid_offer",
        error: "El plan de cuotas solo se ofrece en el downsell.",
      };
    }

    await fakeGatewayDelay(800);

    return {
      ok: true,
      order: buildOrder({
        kind: "upsell",
        customer: data.customer,
        card: data.card,
        lines: [
          {
            id: "upgrade-bundle",
            title: `Los otros ${upgrade.missingCourses.length} cursos del bundle`,
            priceCents: upgrade.upgradeCostCents,
          },
        ],
        paymentPlan: data.paymentPlan,
      }),
    };
  });

/* ------------------------------------------ persistencia de la confirmación */

const SESSION_KEY = "felru-purchase";

export function saveSession(session: PurchaseSession) {
  try {
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    /* sin sessionStorage la confirmación simplemente aparece vacía */
  }
}

export function loadSession(): PurchaseSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as PurchaseSession) : null;
  } catch {
    return null;
  }
}

export function clearSession() {
  try {
    window.sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* nada que limpiar */
  }
}

/* ----------------------------------------------------------- utilidades UI */

export function formatOrderDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export { formatUSD, BUNDLE };

/**
 * Capa de órdenes — corre como función serverless en Vercel.
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

import { BUNDLE_ID, BUNDLE_PRICE_CENTS, formatUSD, getProduct, splitInstallments } from "./catalog";

/* --------------------------------------------------------------- validación */

const checkoutSchema = z.object({
  customer: z.object({
    name: z.string().trim().min(2, "Ingresa tu nombre completo").max(120),
    email: z.string().trim().toLowerCase().email("Ingresa un email válido").max(160),
  }),
  card: z.object({
    brand: z.string().min(1).max(20),
    last4: z.string().regex(/^\d{4}$/, "Tarjeta inválida"),
  }),
  items: z.array(z.string().min(1)).min(1, "El carrito está vacío").max(6),
  paymentPlan: z.enum(["full", "x3"]),
  /** Telemetría del funnel: qué se le ofreció y qué aceptó. */
  funnel: z
    .object({
      upsellShown: z.boolean(),
      upsellAccepted: z.boolean(),
      downsellShown: z.boolean(),
      downsellAccepted: z.boolean(),
    })
    .optional(),
});

export type CheckoutInput = z.input<typeof checkoutSchema>;

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
  customer: { name: string; email: string };
  card: { brand: string; last4: string };
  lines: OrderLine[];
  subtotalCents: number;
  totalCents: number;
  paymentPlan: "full" | "x3";
  installments: OrderInstallment[];
  dueTodayCents: number;
  funnel: {
    upsellShown: boolean;
    upsellAccepted: boolean;
    downsellShown: boolean;
    downsellAccepted: boolean;
  };
};

export type CheckoutResult =
  { ok: true; order: Order } | { ok: false; error: string; code: "card_declined" | "invalid_cart" };

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

/* -------------------------------------------------------- server function */

export const submitCheckout = createServerFn({ method: "POST" })
  .inputValidator((data: CheckoutInput) => checkoutSchema.parse(data))
  .handler(async ({ data }): Promise<CheckoutResult> => {
    // Los precios se recalculan acá contra el catálogo del servidor. Nunca se
    // confía en el total que manda el navegador.
    const uniqueIds = [...new Set(data.items)];
    const lines: OrderLine[] = [];

    for (const id of uniqueIds) {
      const product = getProduct(id);
      if (!product) {
        return { ok: false, code: "invalid_cart", error: `Producto desconocido: ${id}` };
      }
      lines.push({ id: product.id, title: product.title, priceCents: product.priceCents });
    }

    const hasBundle = uniqueIds.includes(BUNDLE_ID);
    const subtotalCents = lines.reduce((sum, line) => sum + line.priceCents, 0);

    // Las 3 cuotas solo existen para el bundle: es la oferta del downsell.
    if (data.paymentPlan === "x3" && !hasBundle) {
      return {
        ok: false,
        code: "invalid_cart",
        error: "El pago en 3 cuotas solo aplica al bundle completo.",
      };
    }

    const totalCents = data.paymentPlan === "x3" ? BUNDLE_PRICE_CENTS : subtotalCents;

    // Latencia simulada para que el estado "procesando pago" se vea en la demo.
    await new Promise((resolve) => setTimeout(resolve, 900));

    if (DECLINED_LAST4.has(data.card.last4)) {
      return {
        ok: false,
        code: "card_declined",
        error: "Tu banco rechazó el pago. Prueba con otra tarjeta.",
      };
    }

    const now = new Date();
    const amounts = data.paymentPlan === "x3" ? splitInstallments(totalCents) : [totalCents];
    const installments: OrderInstallment[] = amounts.map((amountCents, i) => ({
      n: i + 1,
      amountCents,
      dueDate: addDays(now, i * 30),
      status: i === 0 ? "cobrado" : "programado",
    }));

    return {
      ok: true,
      order: {
        id: generateOrderId(),
        createdAt: now.toISOString(),
        customer: data.customer,
        card: data.card,
        lines,
        subtotalCents,
        totalCents,
        paymentPlan: data.paymentPlan,
        installments,
        dueTodayCents: installments[0]?.amountCents ?? 0,
        funnel: data.funnel ?? {
          upsellShown: false,
          upsellAccepted: false,
          downsellShown: false,
          downsellAccepted: false,
        },
      },
    };
  });

/* ------------------------------------------ persistencia de la confirmación */

const LAST_ORDER_KEY = "felru-last-order";

/** Guarda la orden para que /gracias pueda mostrarla tras la redirección. */
export function rememberOrder(order: Order) {
  try {
    window.sessionStorage.setItem(LAST_ORDER_KEY, JSON.stringify(order));
  } catch {
    /* sin sessionStorage la confirmación simplemente aparece vacía */
  }
}

export function recallOrder(): Order | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(LAST_ORDER_KEY);
    return raw ? (JSON.parse(raw) as Order) : null;
  } catch {
    return null;
  }
}

/* ----------------------------------------------------------- utilidades UI */

export function formatOrderDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
}

export { formatUSD };

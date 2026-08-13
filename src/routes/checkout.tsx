import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";

import { CheckoutShell } from "@/components/checkout/CheckoutShell";
import { FunnelOffer } from "@/components/checkout/OfferBlocks";
import { useCart } from "@/lib/cart";
import { INSTALLMENT_COUNT, formatUSD } from "@/lib/catalog";
import {
  TEST_CARDS,
  brandLabel,
  detectBrand,
  formatCardNumber,
  formatExpiry,
  last4,
  onlyDigits,
  validateCardNumber,
  validateCvc,
  validateEmail,
  validateExpiry,
  validateName,
} from "@/lib/card";
import { rememberOrder, submitCheckout } from "@/lib/orders";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — Francisco en las Redes University" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CheckoutPage,
});

const Arrow = () => <span aria-hidden="true">→</span>;

type FormState = {
  name: string;
  email: string;
  cardNumber: string;
  expiry: string;
  cvc: string;
};

type FieldName = keyof FormState;
type Errors = Partial<Record<FieldName, string>>;

const EMPTY_FORM: FormState = { name: "", email: "", cardNumber: "", expiry: "", cvc: "" };

function validateField(field: FieldName, form: FormState): string | null {
  switch (field) {
    case "name":
      return validateName(form.name);
    case "email":
      return validateEmail(form.email);
    case "cardNumber":
      return validateCardNumber(form.cardNumber);
    case "expiry":
      return validateExpiry(form.expiry);
    case "cvc":
      return validateCvc(form.cvc, detectBrand(form.cardNumber));
  }
}

/* ------------------------------------------------------------------ campos */

function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
  className = "",
}: {
  label: string;
  htmlFor: string;
  // El tsconfig usa exactOptionalPropertyTypes, así que un `undefined` explícito
  // tiene que estar en el tipo.
  error?: string | undefined;
  hint?: string | undefined;
  children: ReactNode;
  className?: string | undefined;
}) {
  return (
    <div className={className}>
      <label
        htmlFor={htmlFor}
        className="block text-[11px] font-bold tracking-[0.12em] text-foreground/70 uppercase"
      >
        {label}
      </label>
      <div className="mt-2">{children}</div>
      {error ? (
        <p role="alert" className="mt-1.5 text-xs font-semibold text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-foreground/45">{hint}</p>
      ) : null}
    </div>
  );
}

const inputClass =
  "w-full rounded-lg bg-ink/70 px-4 py-3 text-sm text-foreground ring-1 ring-white/15 outline-none transition-[box-shadow,background-color] placeholder:text-foreground/30 focus:bg-ink focus:ring-2 focus:ring-indigo-soft";

/* -------------------------------------------------------------------- page */

function CheckoutPage() {
  const cart = useCart();
  const navigate = useNavigate();

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<"idle" | "processing">("idle");
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const brand = detectBrand(form.cardNumber);
  const isThreePayments = cart.hasBundle && cart.paymentPlan === "x3";

  const setField = (field: FieldName, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    // Solo limpiamos el error al escribir; se vuelve a validar en blur.
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
    if (paymentError) setPaymentError(null);
  };

  const handleBlur = (field: FieldName) => {
    const error = validateField(field, form);
    setErrors((prev) => ({ ...prev, [field]: error ?? undefined }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (status === "processing") return;

    const fields: FieldName[] = ["name", "email", "cardNumber", "expiry", "cvc"];
    const nextErrors: Errors = {};
    for (const field of fields) {
      const error = validateField(field, form);
      if (error) nextErrors[field] = error;
    }
    setErrors(nextErrors);

    const firstInvalid = fields.find((field) => nextErrors[field]);
    if (firstInvalid) {
      document.getElementById(firstInvalid)?.focus();
      return;
    }

    setStatus("processing");
    setPaymentError(null);

    try {
      const result = await submitCheckout({
        data: {
          customer: { name: form.name, email: form.email },
          // El número completo nunca sale del navegador.
          card: { brand: brandLabel(brand), last4: last4(form.cardNumber) },
          items: cart.lines.map((line) => line.id),
          paymentPlan: cart.paymentPlan,
          funnel: cart.funnel,
        },
      });

      if (!result.ok) {
        setPaymentError(result.error);
        setStatus("idle");
        return;
      }

      rememberOrder(result.order);
      cart.clear();
      await navigate({ to: "/gracias" });
    } catch {
      setPaymentError("No pudimos conectar con el procesador de pagos. Intentá de nuevo.");
      setStatus("idle");
    }
  };

  if (!cart.hydrated) {
    return (
      <CheckoutShell>
        <div className="grid min-h-[40vh] place-items-center">
          <p className="text-sm text-foreground/50">Cargando tu carrito…</p>
        </div>
      </CheckoutShell>
    );
  }

  if (cart.isEmpty) {
    return (
      <CheckoutShell>
        <div className="card-ink mx-auto max-w-lg rounded-2xl p-8 text-center sm:p-10">
          <h1 className="display text-2xl">Tu carrito está vacío</h1>
          <p className="mt-3 text-sm leading-relaxed text-foreground/75">
            Elige un curso suelto o llévate el bundle completo con los 5 cursos.
          </p>
          <Link to="/" className="btn-lime btn-sweep mt-7">
            Ver los cursos <Arrow />
          </Link>
        </div>
      </CheckoutShell>
    );
  }

  return (
    <CheckoutShell>
      <div className="mb-8">
        <p className="eyebrow text-foreground/60">Paso final</p>
        <h1 className="display mt-3 text-[clamp(1.8rem,4.5vw,2.8rem)]">Completa tu inscripción</h1>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:gap-10">
        {/* ------------------------------------------------------- formulario */}
        <form onSubmit={handleSubmit} noValidate className="min-w-0">
          <section className="card-ink rounded-2xl p-5 sm:p-7">
            <h2 className="text-sm font-bold tracking-[0.1em] uppercase">1 · Tus datos</h2>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <Field label="Nombre completo" htmlFor="name" error={errors.name}>
                <input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  placeholder="Francisco Pérez"
                  value={form.name}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setField("name", e.target.value)}
                  onBlur={() => handleBlur("name")}
                  aria-invalid={Boolean(errors.name)}
                  className={inputClass}
                />
              </Field>

              <Field
                label="Email"
                htmlFor="email"
                error={errors.email}
                hint="Ahí te mandamos los accesos"
              >
                <input
                  id="email"
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="tu@email.com"
                  value={form.email}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setField("email", e.target.value)}
                  onBlur={() => handleBlur("email")}
                  aria-invalid={Boolean(errors.email)}
                  className={inputClass}
                />
              </Field>
            </div>
          </section>

          <section className="card-ink mt-5 rounded-2xl p-5 sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-bold tracking-[0.1em] uppercase">2 · Pago</h2>
              {brand !== "desconocida" && (
                <span className="rounded-md bg-white/10 px-2.5 py-1 text-[10px] font-bold tracking-[0.12em] uppercase">
                  {brandLabel(brand)}
                </span>
              )}
            </div>

            <div className="mt-6 grid gap-5">
              <Field label="Número de tarjeta" htmlFor="cardNumber" error={errors.cardNumber}>
                <input
                  id="cardNumber"
                  name="cardNumber"
                  type="text"
                  inputMode="numeric"
                  autoComplete="cc-number"
                  placeholder="4242 4242 4242 4242"
                  value={form.cardNumber}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setField("cardNumber", formatCardNumber(e.target.value))
                  }
                  onBlur={() => handleBlur("cardNumber")}
                  aria-invalid={Boolean(errors.cardNumber)}
                  className={`${inputClass} font-mono tracking-wider`}
                />
              </Field>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Vencimiento" htmlFor="expiry" error={errors.expiry}>
                  <input
                    id="expiry"
                    name="expiry"
                    type="text"
                    inputMode="numeric"
                    autoComplete="cc-exp"
                    placeholder="MM/AA"
                    value={form.expiry}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      setField("expiry", formatExpiry(e.target.value))
                    }
                    onBlur={() => handleBlur("expiry")}
                    aria-invalid={Boolean(errors.expiry)}
                    className={`${inputClass} font-mono tracking-wider`}
                  />
                </Field>

                <Field label="CVC" htmlFor="cvc" error={errors.cvc}>
                  <input
                    id="cvc"
                    name="cvc"
                    type="text"
                    inputMode="numeric"
                    autoComplete="cc-csc"
                    placeholder={brand === "amex" ? "1234" : "123"}
                    value={form.cvc}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      setField("cvc", onlyDigits(e.target.value).slice(0, 4))
                    }
                    onBlur={() => handleBlur("cvc")}
                    aria-invalid={Boolean(errors.cvc)}
                    className={`${inputClass} font-mono tracking-wider`}
                  />
                </Field>
              </div>
            </div>

            {/* ayuda de demo */}
            <div className="mt-6 rounded-xl bg-indigo/12 px-4 py-4 ring-1 ring-indigo-soft/30">
              <p className="text-[11px] font-bold tracking-[0.12em] text-periwinkle uppercase">
                Tarjetas de prueba
              </p>
              <ul className="mt-3 space-y-2">
                {TEST_CARDS.map((card) => (
                  <li key={card.number} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <button
                      type="button"
                      onClick={() => setField("cardNumber", card.number)}
                      className="font-mono text-xs tracking-wider text-foreground underline underline-offset-4 transition-colors hover:text-lime"
                    >
                      {card.number}
                    </button>
                    <span className="text-xs text-foreground/60">{card.label}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[11px] leading-relaxed text-foreground/45">
                Cualquier vencimiento futuro y CVC sirven. No se procesa ningún cobro.
              </p>
            </div>

            {paymentError && (
              <p
                role="alert"
                className="mt-5 rounded-lg border border-destructive/60 bg-destructive/15 px-4 py-3 text-sm font-semibold text-foreground"
              >
                {paymentError}
              </p>
            )}

            <button
              type="submit"
              disabled={status === "processing"}
              className="btn-lime btn-sweep mt-6 w-full disabled:cursor-not-allowed disabled:opacity-70"
            >
              {status === "processing" ? (
                "Procesando pago…"
              ) : (
                <>
                  Pagar {formatUSD(cart.dueTodayCents)} <Arrow />
                </>
              )}
            </button>

            <p className="mt-4 text-center text-[11px] leading-relaxed text-foreground/45">
              Al confirmar aceptas los términos del programa. Acceso inmediato tras el pago.
            </p>
          </section>
        </form>

        {/* ---------------------------------------------------------- resumen */}
        <aside className="min-w-0 lg:sticky lg:top-8 lg:self-start">
          <div className="card-ink rounded-2xl p-5 sm:p-6">
            <h2 className="text-sm font-bold tracking-[0.1em] uppercase">Tu pedido</h2>

            <ul className="mt-5 space-y-4">
              {cart.lines.map((line) => (
                <li key={line.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                  <div className="min-w-0">
                    <p className="text-sm leading-tight font-bold text-pretty">{line.title}</p>
                    {line.isBundle && (
                      <p className="mt-1 text-[11px] font-bold tracking-wide text-lime uppercase">
                        Los 5 cursos incluidos
                      </p>
                    )}
                  </div>
                  <span className="text-sm font-bold whitespace-nowrap">
                    {formatUSD(line.priceCents)}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-5 space-y-2 border-t border-white/12 pt-5 text-sm">
              <div className="flex items-baseline justify-between text-foreground/70">
                <span>Subtotal</span>
                <span>{formatUSD(cart.subtotalCents)}</span>
              </div>
              <div className="flex items-baseline justify-between text-foreground/70">
                <span>Impuestos</span>
                <span>Incluidos</span>
              </div>
            </div>

            {isThreePayments ? (
              <div className="mt-5 border-t border-white/12 pt-5">
                <p className="text-[11px] font-bold tracking-[0.12em] text-lime uppercase">
                  Plan de {INSTALLMENT_COUNT} cuotas sin recargo
                </p>
                <ol className="mt-3 space-y-2">
                  {cart.installments.map((amount, i) => (
                    <li
                      key={i}
                      className="flex items-baseline justify-between text-sm text-foreground/80"
                    >
                      <span>{i === 0 ? "Hoy" : `En ${i} ${i === 1 ? "mes" : "meses"}`}</span>
                      <span className="font-bold">{formatUSD(amount)}</span>
                    </li>
                  ))}
                </ol>
                <div className="mt-4 flex items-baseline justify-between border-t border-white/12 pt-4">
                  <span className="text-sm font-bold">Hoy pagas</span>
                  <span className="display text-3xl text-lime">
                    {formatUSD(cart.dueTodayCents)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="mt-5 flex items-baseline justify-between border-t border-white/12 pt-5">
                <span className="text-sm font-bold">Total</span>
                <span className="display text-3xl">{formatUSD(cart.totalCents)}</span>
              </div>
            )}
          </div>

          {/* el funnel sigue disponible hasta el último momento */}
          <div className="mt-6">
            <FunnelOffer compact />
          </div>
        </aside>
      </div>
    </CheckoutShell>
  );
}

import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";

import { CheckoutShell } from "@/components/checkout/CheckoutShell";
import {
  BUNDLE_ID,
  BUNDLE_PRICE_CENTS,
  INSTALLMENT_COUNT,
  calcUpgrade,
  formatUSD,
  getProduct,
  splitInstallments,
} from "@/lib/catalog";
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
import { saveSession, submitCheckout } from "@/lib/orders";

type CheckoutSearch = { offer: string };

export const Route = createFileRoute("/checkout")({
  validateSearch: (search: Record<string, unknown>): CheckoutSearch => ({
    offer: typeof search["offer"] === "string" ? search["offer"] : BUNDLE_ID,
  }),
  head: () => ({
    meta: [
      { title: "Checkout — Francisco en las Redes University" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CheckoutPage,
});

/* ------------------------------------------------------------------ campos */

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

const inputClass =
  "w-full rounded-[4px] border border-[#ccd0d7] bg-white px-3 py-2.5 text-[15px] text-[#1a1d26] outline-none transition-colors placeholder:text-[#a8adb7] focus:border-[#6265fe] focus:ring-2 focus:ring-[#6265fe]/20";

function Field({
  label,
  htmlFor,
  error,
  children,
  className = "",
}: {
  label: string;
  htmlFor: string;
  error?: string | undefined;
  children: ReactNode;
  className?: string | undefined;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="block text-[13px] font-medium text-[#4b5563]">
        {label}
      </label>
      <div className="mt-1.5">{children}</div>
      {error && (
        <p role="alert" className="mt-1 text-[12px] text-[#c02b2b]">
          {error}
        </p>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------- page */

function CheckoutPage() {
  const { offer } = Route.useSearch();
  const navigate = useNavigate();

  const product = getProduct(offer);
  const isBundle = product?.id === BUNDLE_ID;
  const upgrade = product && !isBundle ? calcUpgrade(product.id) : null;

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Errors>({});
  const [bump, setBump] = useState(false);
  const [paymentPlan, setPaymentPlan] = useState<"full" | "x3">("full");
  const [status, setStatus] = useState<"idle" | "processing">("idle");
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const brand = detectBrand(form.cardNumber);

  if (!product) {
    return (
      <CheckoutShell>
        <div className="mx-auto max-w-lg rounded-md border border-[#e3e5e9] bg-white p-8 text-center">
          <h1 className="text-xl font-bold">No encontramos ese producto</h1>
          <p className="mt-2 text-[15px] text-[#6b7280]">
            El enlace puede estar mal escrito o la oferta ya no está disponible.
          </p>
          <Link
            to="/"
            className="mt-6 inline-block rounded-[4px] bg-[#6265fe] px-6 py-3 text-sm font-bold text-white"
          >
            Volver al inicio
          </Link>
        </div>
      </CheckoutShell>
    );
  }

  // El bump agrega los cursos que faltan; el total pasa a ser el del bundle.
  const bumpApplied = bump && upgrade !== null;
  const totalCents = bumpApplied ? BUNDLE_PRICE_CENTS : product.priceCents;

  // Las 3 cuotas solo existen sobre el bundle completo (como Payment Plan de
  // la Offer en Kajabi), sea comprado directo o alcanzado con el bump.
  const canPayInInstallments = totalCents === BUNDLE_PRICE_CENTS;
  const plan = canPayInInstallments ? paymentPlan : "full";
  const installments =
    plan === "x3" ? splitInstallments(totalCents, INSTALLMENT_COUNT) : [totalCents];
  const dueTodayCents = installments[0] ?? 0;

  const setField = (field: FieldName, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
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

    const customer = { name: form.name, email: form.email };
    // El número completo nunca sale del navegador.
    const card = { brand: brandLabel(brand), last4: last4(form.cardNumber) };

    try {
      const result = await submitCheckout({
        data: { offer: product.id, bump: bumpApplied, paymentPlan: plan, customer, card },
      });

      if (!result.ok) {
        setPaymentError(result.error);
        setStatus("idle");
        return;
      }

      const ownsBundle = isBundle || bumpApplied;
      saveSession({
        main: result.order,
        baseOffer: product.id,
        ownsBundle,
        pipeline: {
          bumpOffered: upgrade !== null,
          bumpTaken: bumpApplied,
          upsellShown: false,
          upsellAccepted: false,
          downsellShown: false,
          downsellAccepted: false,
        },
      });

      // Quien ya tiene los 5 cursos no pasa por el pipeline de ofertas.
      await navigate({ to: ownsBundle ? "/gracias" : "/oferta" });
    } catch {
      setPaymentError("No pudimos conectar con el procesador de pagos. Intenta de nuevo.");
      setStatus("idle");
    }
  };

  return (
    <CheckoutShell>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:gap-8">
        {/* ------------------------------------------------------- formulario */}
        <form onSubmit={handleSubmit} noValidate className="min-w-0 lg:order-1">
          <div className="rounded-md border border-[#e3e5e9] bg-white p-5 sm:p-6">
            <h2 className="text-[15px] font-bold">Información de contacto</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Nombre completo" htmlFor="name" error={errors.name}>
                <input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  value={form.name}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setField("name", e.target.value)}
                  onBlur={() => handleBlur("name")}
                  aria-invalid={Boolean(errors.name)}
                  className={inputClass}
                />
              </Field>
              <Field label="Email" htmlFor="email" error={errors.email}>
                <input
                  id="email"
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setField("email", e.target.value)}
                  onBlur={() => handleBlur("email")}
                  aria-invalid={Boolean(errors.email)}
                  className={inputClass}
                />
              </Field>
            </div>
          </div>

          <div className="mt-5 rounded-md border border-[#e3e5e9] bg-white p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[15px] font-bold">Información de pago</h2>
              {brand !== "desconocida" && (
                <span className="rounded bg-[#eef0f4] px-2 py-1 text-[11px] font-semibold text-[#4b5563]">
                  {brandLabel(brand)}
                </span>
              )}
            </div>

            <div className="mt-4 grid gap-4">
              <Field label="Número de tarjeta" htmlFor="cardNumber" error={errors.cardNumber}>
                <input
                  id="cardNumber"
                  name="cardNumber"
                  type="text"
                  inputMode="numeric"
                  autoComplete="cc-number"
                  placeholder="1234 1234 1234 1234"
                  value={form.cardNumber}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setField("cardNumber", formatCardNumber(e.target.value))
                  }
                  onBlur={() => handleBlur("cardNumber")}
                  aria-invalid={Boolean(errors.cardNumber)}
                  className={inputClass}
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Vencimiento (MM/AA)" htmlFor="expiry" error={errors.expiry}>
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
                    className={inputClass}
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
                    className={inputClass}
                  />
                </Field>
              </div>
            </div>

            {/* Plan de pago — en Kajabi son las "payment options" de la Offer */}
            {canPayInInstallments && (
              <fieldset className="mt-6">
                <legend className="text-[13px] font-medium text-[#4b5563]">Plan de pago</legend>
                <div className="mt-2 grid gap-2">
                  <PlanOption
                    checked={plan === "full"}
                    onChange={() => setPaymentPlan("full")}
                    label={`Un solo pago de ${formatUSD(BUNDLE_PRICE_CENTS)}`}
                    hint="Acceso inmediato"
                  />
                  <PlanOption
                    checked={plan === "x3"}
                    onChange={() => setPaymentPlan("x3")}
                    label={`${INSTALLMENT_COUNT} pagos de ${formatUSD(splitInstallments(BUNDLE_PRICE_CENTS, INSTALLMENT_COUNT)[0] ?? 0)}`}
                    hint="Sin recargo · se cobra 1 por mes"
                  />
                </div>
              </fieldset>
            )}

            {/* ---------------------------------------------------- Order Bump */}
            {upgrade && upgrade.upgradeCostCents > 0 && (
              <div className="mt-6 rounded-md border-2 border-dashed border-[#e0a800] bg-[#fffbeb] p-4">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={bump}
                    onChange={(e) => {
                      setBump(e.target.checked);
                      if (!e.target.checked) setPaymentPlan("full");
                    }}
                    className="mt-0.5 h-[18px] w-[18px] shrink-0 accent-[#6265fe]"
                  />
                  <span className="min-w-0">
                    <span className="block text-[15px] leading-snug font-bold text-[#1a1d26]">
                      ¡Sí! Añade los otros {upgrade.missingCourses.length} cursos por solo{" "}
                      {formatUSD(upgrade.upgradeCostCents)} más
                    </span>
                    <span className="mt-1.5 block text-[13px] leading-relaxed text-[#5a5344]">
                      Completa el bundle de {formatUSD(BUNDLE_PRICE_CENTS)}: te acreditamos lo que
                      ya estás pagando por este curso. Por separado costarían{" "}
                      <span className="line-through">{formatUSD(upgrade.missingValueCents)}</span>.
                    </span>
                  </span>
                </label>
              </div>
            )}

            {paymentError && (
              <p
                role="alert"
                className="mt-5 rounded border border-[#e5b4b4] bg-[#fdf2f2] px-4 py-3 text-[14px] font-medium text-[#a52222]"
              >
                {paymentError}
              </p>
            )}

            <button
              type="submit"
              disabled={status === "processing"}
              className="mt-6 w-full rounded-[4px] bg-[#6265fe] px-6 py-4 text-[15px] font-bold text-white transition-colors hover:bg-[#5053e8] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {status === "processing"
                ? "Procesando pago…"
                : `Completar compra — ${formatUSD(dueTodayCents)}`}
            </button>

            <p className="mt-3 flex items-center justify-center gap-1.5 text-[12px] text-[#6b7280]">
              <LockGlyph />
              Pago cifrado. Al comprar aceptas los términos del programa.
            </p>
          </div>

          {/* ayuda de demo — esto no existe en Kajabi, es solo para la prueba */}
          <div className="mt-4 rounded-md border border-dashed border-[#c9cdd6] bg-white/60 p-4">
            <p className="text-[11px] font-bold tracking-wide text-[#6b7280] uppercase">
              Tarjetas de prueba (solo demo)
            </p>
            <ul className="mt-2 space-y-1">
              {TEST_CARDS.map((card) => (
                <li key={card.number} className="flex flex-wrap items-center gap-x-3 text-[13px]">
                  <button
                    type="button"
                    onClick={() => setField("cardNumber", card.number)}
                    className="font-mono text-[#4b5563] underline underline-offset-2 hover:text-[#6265fe]"
                  >
                    {card.number}
                  </button>
                  <span className="text-[#9aa0ab]">{card.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </form>

        {/* ---------------------------------------------------------- resumen */}
        <aside className="min-w-0 lg:order-2">
          <div className="rounded-md border border-[#e3e5e9] bg-white p-5 sm:p-6 lg:sticky lg:top-6">
            <h2 className="text-[15px] font-bold">Resumen del pedido</h2>

            <ul className="mt-4 space-y-3 border-b border-[#eceef2] pb-4">
              <li className="flex items-start justify-between gap-3">
                <span className="min-w-0 text-[14px] text-[#4b5563]">{product.title}</span>
                <span className="text-[14px] font-semibold whitespace-nowrap">
                  {formatUSD(product.priceCents)}
                </span>
              </li>
              {bumpApplied && upgrade && (
                <li className="flex items-start justify-between gap-3">
                  <span className="min-w-0 text-[14px] text-[#4b5563]">
                    Los otros {upgrade.missingCourses.length} cursos del bundle
                  </span>
                  <span className="text-[14px] font-semibold whitespace-nowrap">
                    {formatUSD(upgrade.upgradeCostCents)}
                  </span>
                </li>
              )}
            </ul>

            <div className="mt-4 flex items-baseline justify-between">
              <span className="text-[15px] font-bold">Total</span>
              <span className="text-[22px] font-bold">{formatUSD(totalCents)}</span>
            </div>

            {plan === "x3" && (
              <div className="mt-4 rounded border border-[#e3e5e9] bg-[#fafbfc] p-3">
                <p className="text-[12px] font-semibold text-[#4b5563]">
                  {INSTALLMENT_COUNT} pagos sin recargo
                </p>
                <ol className="mt-2 space-y-1">
                  {installments.map((amount, i) => (
                    <li key={i} className="flex justify-between text-[13px] text-[#6b7280]">
                      <span>{i === 0 ? "Hoy" : `Mes ${i + 1}`}</span>
                      <span className="font-medium">{formatUSD(amount)}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            <p className="mt-4 text-[12px] leading-relaxed text-[#6b7280]">
              Acceso inmediato tras el pago. Recibirás los datos de acceso por email.
            </p>
          </div>
        </aside>
      </div>
    </CheckoutShell>
  );
}

function PlanOption({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  hint: string;
}) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-3 rounded-[4px] border px-3 py-2.5 transition-colors ${
        checked ? "border-[#6265fe] bg-[#f3f3ff]" : "border-[#ccd0d7] bg-white"
      }`}
    >
      <input
        type="radio"
        name="paymentPlan"
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 shrink-0 accent-[#6265fe]"
      />
      <span className="min-w-0">
        <span className="block text-[14px] font-semibold text-[#1a1d26]">{label}</span>
        <span className="block text-[12px] text-[#6b7280]">{hint}</span>
      </span>
    </label>
  );
}

const LockGlyph = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3 w-3">
    <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
    <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
  </svg>
);

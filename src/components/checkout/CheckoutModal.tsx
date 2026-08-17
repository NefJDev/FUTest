/**
 * Popup checkout — réplica del de Kajabi.
 *
 * Calcado de la estructura real (Kajabi lo llama "popup checkout" y lo renderiza
 * con su design system Sage). En la referencia del cliente:
 *
 *   Cabecera: logo en chip + nombre de la marca + cerrar
 *   Izquierda: título del producto, miniatura, precio grande con chip de moneda,
 *              "AGREGAR A TU COMPRA" (order bump), "Resumen", "Ahora"
 *   Derecha:   "Contacto", "Método de pago" (radios), guardar tarjeta, botón pill
 *   Pie:       "Las transacciones son seguras y encriptadas"
 *
 * Lo único que Kajabi deja tocar acá son el logo, los colores, la tipografía y
 * los textos: la estructura y los campos son fijos. Por eso esto no se diseñó
 * "bonito", se copió.
 */

import { useNavigate } from "@tanstack/react-router";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react";

import {
  BUNDLE_ID,
  BUNDLE_PRICE_CENTS,
  CATALOG_VALUE_CENTS,
  COURSES,
  INSTALLMENT_COUNT,
  calcUpgrade,
  formatAmount,
  formatUSD,
  getPairedOffer,
  getProduct,
  splitInstallments,
  withCourseNumber,
  type ProductId,
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
import { saveSession, submitCheckout, type BumpId } from "@/lib/orders";

/* ------------------------------------------------------------- marca (tema) */

/** Lo que en Kajabi se configura en el tema del checkout. */
const BRAND = {
  name: "Francisco en las Redes University",
  /** Color del botón de pago. */
  action: "#6265fe",
  actionHover: "#5053e8",
  actionText: "#ffffff",
};

/* ------------------------------------------------------------------ context */

type CheckoutContextValue = { open: (offer: ProductId) => void };

const CheckoutContext = createContext<CheckoutContextValue | null>(null);

/** Envuelve la landing para que cualquier botón pueda abrir el popup. */
export function CheckoutProvider({ children }: { children: ReactNode }) {
  const [offer, setOffer] = useState<ProductId | null>(null);
  const open = useCallback((next: ProductId) => setOffer(next), []);

  return (
    <CheckoutContext.Provider value={{ open }}>
      {children}
      {offer && <CheckoutModal offer={offer} onClose={() => setOffer(null)} />}
    </CheckoutContext.Provider>
  );
}

export function useCheckout(): CheckoutContextValue {
  const ctx = useContext(CheckoutContext);
  if (!ctx) throw new Error("useCheckout debe usarse dentro de <CheckoutProvider>");
  return ctx;
}

/* ------------------------------------------------------------------ formulario */

type FormState = { name: string; email: string; cardNumber: string; expiry: string; cvc: string };
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
  "w-full rounded-lg border border-[#d6d9de] bg-white px-3.5 py-2.5 text-[14px] text-[#1a1d26] outline-none transition-colors placeholder:text-[#a8adb7] focus:border-[#6265fe] focus:ring-2 focus:ring-[#6265fe]/15";

/* ------------------------------------------------------------------- modal */

export function CheckoutModal({ offer, onClose }: { offer: ProductId; onClose: () => void }) {
  const navigate = useNavigate();
  const product = getProduct(offer);
  const isBundle = product?.id === BUNDLE_ID;
  const upgrade = product && !isBundle ? calcUpgrade(product.id) : null;
  // Curso complementario según el mapa de afinidad del catálogo.
  const paired = product && !isBundle ? getPairedOffer(product.id) : null;

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Errors>({});
  const [pairedTaken, setPairedTaken] = useState(false);
  const [bundleTaken, setBundleTaken] = useState(false);
  const [paymentPlan, setPaymentPlan] = useState<"full" | "x3">("full");
  const [method, setMethod] = useState<"card" | "paypal">("card");
  const [saveCard, setSaveCard] = useState(false);
  const [status, setStatus] = useState<"idle" | "processing">("idle");
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Bloquear el scroll del fondo mientras el popup está abierto.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  if (!product) return null;

  const bundleApplied = bundleTaken && upgrade !== null;
  const pairedApplied = pairedTaken && paired !== null && !bundleApplied;

  const totalCents = bundleApplied
    ? BUNDLE_PRICE_CENTS
    : product.priceCents + (pairedApplied && paired ? paired.priceCents : 0);

  const canPayInInstallments = totalCents === BUNDLE_PRICE_CENTS;
  const plan = canPayInInstallments ? paymentPlan : "full";
  const installments =
    plan === "x3" ? splitInstallments(totalCents, INSTALLMENT_COUNT) : [totalCents];
  const dueTodayCents = installments[0] ?? 0;
  const brand = detectBrand(form.cardNumber);

  const togglePaired = () => {
    if (bundleApplied) return; // ya está incluido
    setPairedTaken((prev) => !prev);
  };

  const toggleBundle = () => {
    setBundleTaken((prev) => {
      const next = !prev;
      // El bundle contiene al curso complementario: se desmarca solo.
      if (next) setPairedTaken(false);
      else setPaymentPlan("full");
      return next;
    });
  };

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

    // Con PayPal no se piden datos de tarjeta, igual que en Kajabi.
    const fields: FieldName[] =
      method === "paypal" ? ["name", "email"] : ["name", "email", "cardNumber", "expiry", "cvc"];

    const nextErrors: Errors = {};
    for (const field of fields) {
      const error = validateField(field, form);
      if (error) nextErrors[field] = error;
    }
    setErrors(nextErrors);

    const firstInvalid = fields.find((field) => nextErrors[field]);
    if (firstInvalid) {
      document.getElementById(`co-${firstInvalid}`)?.focus();
      return;
    }

    setStatus("processing");
    setPaymentError(null);

    const customer = { name: form.name, email: form.email };
    // El número completo nunca sale del navegador.
    const card =
      method === "paypal"
        ? { brand: "PayPal", last4: "0000" }
        : { brand: brandLabel(brand), last4: last4(form.cardNumber) };

    const bumps: BumpId[] = bundleApplied ? ["bundle"] : pairedApplied ? ["paired"] : [];

    try {
      const result = await submitCheckout({
        data: { offer: product.id, bumps, paymentPlan: plan, customer, card },
      });

      if (!result.ok) {
        setPaymentError(result.error);
        setStatus("idle");
        return;
      }

      const ownsBundle = isBundle || bundleApplied;
      saveSession({
        main: result.order,
        baseOffer: product.id,
        ownsBundle,
        pipeline: {
          bumpOffered: upgrade !== null,
          pairedTaken: pairedApplied,
          bundleBumpTaken: bundleApplied,
          upsellShown: false,
          upsellAccepted: false,
          downsellShown: false,
          downsellAccepted: false,
        },
      });

      await navigate({ to: ownsBundle ? "/gracias" : "/oferta" });
    } catch {
      setPaymentError("No pudimos conectar con el procesador de pagos. Intenta de nuevo.");
      setStatus("idle");
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center overflow-y-auto bg-black/55 p-0 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Checkout"
      data-no-reveal
    >
      <div className="my-auto w-full max-w-[1000px] overflow-hidden rounded-none bg-white text-[#1a1d26] shadow-2xl sm:rounded-2xl">
        {/* ------------------------------------------------------- cabecera */}
        <div className="flex items-center justify-between gap-4 border-b border-[#eceef2] px-5 py-3.5">
          <div className="flex min-w-0 items-center gap-3">
            {/* El escudo va directo sobre el blanco de la cabecera, sin chip.
                overflow-hidden evita que la imagen pueda desbordarse sobre el
                nombre, que es lo que pasaba con el lockup horizontal. */}
            <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-lg">
              <img src="/favicon.png" alt="" className="h-6 w-6 object-contain" />
            </span>
            <span className="truncate text-[15px] font-medium">{BRAND.name}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[#6b7280] transition-colors hover:bg-[#f4f5f7]"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              className="h-5 w-5"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="grid md:grid-cols-2">
          {/* ------------------------------------------------------ izquierda */}
          <div className="border-b border-[#eceef2] bg-[#fafbfc] px-5 py-6 md:border-r md:border-b-0 md:px-7">
            <h2 className="text-[20px] leading-snug font-semibold">
              {withCourseNumber(product.id, product.title)}
            </h2>

            <div className="mt-4 flex items-center gap-4">
              <img
                src={product.thumb}
                alt=""
                className="h-[70px] w-[110px] shrink-0 rounded-md object-cover"
              />
              <p className="flex items-baseline gap-2">
                <CurrencyChip />
                <span className="text-[26px] font-bold">USD {formatAmount(totalCents)}</span>
              </p>
            </div>

            {/* Descripción de la Offer. En Kajabi es el campo de texto enriquecido
                que se edita en la Offer y se muestra en el checkout. */}
            <div className="mt-5">
              {isBundle ? (
                <>
                  <p className="text-[13px] font-semibold">Incluye los 5 cursos:</p>
                  <ul className="mt-2.5 space-y-2">
                    {COURSES.map((course) => (
                      <li key={course.id} className="flex items-center gap-2.5">
                        <img
                          src={course.thumb}
                          alt=""
                          className="h-8 w-12 shrink-0 rounded object-cover"
                        />
                        <span className="min-w-0 flex-1 text-[12.5px] leading-snug text-[#4b5563]">
                          {withCourseNumber(course.id, course.short)}
                        </span>
                        <span className="text-[12px] whitespace-nowrap text-[#9aa0ab] line-through">
                          {formatUSD(course.priceCents)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-[12.5px] text-[#4b5563]">
                    <span className="line-through">{formatUSD(CATALOG_VALUE_CENTS)}</span> Pago
                    único · Acceso inmediato a los 5 cursos
                  </p>
                </>
              ) : (
                <p className="text-[12.5px] leading-relaxed text-[#4b5563]">{product.desc}</p>
              )}
            </div>

            {/* ------------------------------------------------- order bumps */}
            {paired && upgrade && upgrade.upgradeCostCents > 0 && (
              <>
                <p className="mt-7 border-t border-[#e6e8ec] pt-6 text-[11px] font-semibold tracking-[0.1em] text-[#6b7280] uppercase">
                  Agregar a tu compra
                </p>

                {/* Bump 1 — el curso complementario, con el porqué de la sugerencia */}
                <BumpCard
                  selected={pairedTaken}
                  disabled={bundleTaken}
                  onToggle={togglePaired}
                  thumb={paired.course.thumb}
                  // El correlativo va ahora en el título, así que sale del eyebrow.
                  eyebrow="Combina con lo que ya llevas"
                  title={withCourseNumber(paired.course.id, paired.course.short)}
                  priceCents={paired.priceCents}
                  listPriceCents={paired.listPriceCents}
                  badge={`-${paired.discountPercent}%`}
                  disabledNote={bundleTaken ? "Ya incluido en el bundle" : undefined}
                >
                  <p className="mt-1 text-[12.5px] leading-relaxed text-[#5a6070]">
                    <strong className="text-[#1a1d26]">Por qué te lo recomendamos</strong> —{" "}
                    {paired.reason}
                  </p>
                </BumpCard>

                {/* Bump 2 — completar los 5 cursos */}
                <BumpCard
                  selected={bundleTaken}
                  onToggle={toggleBundle}
                  thumb={upgrade.missingCourses[0]?.thumb}
                  eyebrow="También puedes adquirir la opción más completa"
                  title="Bundle completo: llévate los 5 cursos"
                  priceCents={upgrade.upgradeCostCents}
                  listPriceCents={upgrade.missingValueCents}
                  badge={`-${upgrade.discountPercent}%`}
                  highlight
                >
                  <p className="mt-1 text-[12.5px] leading-relaxed text-[#5a6070]">
                    <strong className="text-[#1a1d26]">Por qué te lo recomendamos</strong> — Con el
                    bundle ves todo en orden, cada curso complementa al otro y entiendes el proceso
                    completo.
                  </p>
                  <ul className="mt-2.5 space-y-1.5">
                    {upgrade.missingCourses.map((course) => (
                      <li
                        key={course.id}
                        className="flex items-center gap-2 text-[12px] text-[#4b5563]"
                      >
                        <span className="text-[#22a06b]">✓</span>
                        <span className="min-w-0 flex-1 truncate">
                          {withCourseNumber(course.id, course.short)}
                        </span>
                        <span className="whitespace-nowrap text-[#9aa0ab] line-through">
                          {formatUSD(course.priceCents)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </BumpCard>
              </>
            )}

            {/* ------------------------------------------------------ resumen */}
            <h3 className="mt-7 border-t border-[#e6e8ec] pt-6 text-[18px] font-semibold">
              Resumen
            </h3>

            <ul className="mt-4 space-y-3">
              <li className="flex items-center gap-3">
                <img
                  src={product.thumb}
                  alt=""
                  className="h-11 w-16 shrink-0 rounded object-cover"
                />
                {/* lineTitle y no title: esto es una línea de concepto con su
                    importe al lado, así que nombra el producto en vez de
                    repetir el titular. */}
                <span className="min-w-0 flex-1 text-[13.5px] leading-snug">
                  {withCourseNumber(product.id, product.lineTitle)}
                </span>
                <span className="text-[13.5px] whitespace-nowrap">
                  USD {formatAmount(product.priceCents)}
                </span>
              </li>

              {pairedApplied && paired && (
                <li className="flex items-center gap-3">
                  <img
                    src={paired.course.thumb}
                    alt=""
                    className="h-11 w-16 shrink-0 rounded object-cover"
                  />
                  <span className="min-w-0 flex-1 text-[13.5px] leading-snug">
                    {withCourseNumber(paired.course.id, paired.course.short)}
                  </span>
                  <span className="text-[13.5px] whitespace-nowrap">
                    USD {formatAmount(paired.priceCents)}
                  </span>
                </li>
              )}

              {bundleApplied && upgrade && (
                <li className="flex items-center gap-3">
                  <span
                    className="grid h-11 w-16 shrink-0 place-items-center rounded text-[11px] font-bold text-white"
                    style={{ backgroundColor: BRAND.action }}
                  >
                    +{upgrade.missingCourses.length}
                  </span>
                  <span className="min-w-0 flex-1 text-[13.5px] leading-snug">
                    Los otros {upgrade.missingCourses.length} cursos del bundle
                  </span>
                  <span className="text-[13.5px] whitespace-nowrap">
                    USD {formatAmount(upgrade.upgradeCostCents)}
                  </span>
                </li>
              )}
            </ul>

            {/* ------------------------------------------------------- ahora */}
            <div className="mt-6 flex items-center justify-between gap-4 border-t border-[#e6e8ec] pt-5">
              <h3 className="text-[20px] font-semibold">Ahora</h3>
              <p className="flex items-baseline gap-2">
                <CurrencyChip />
                <span className="text-[22px] font-bold">USD {formatAmount(dueTodayCents)}</span>
              </p>
            </div>

            {plan === "x3" && (
              <p className="mt-2 text-right text-[12px] text-[#6b7280]">
                y {INSTALLMENT_COUNT - 1} pagos mensuales de {formatUSD(installments[1] ?? 0)} —{" "}
                {formatUSD(totalCents)} en total
              </p>
            )}
          </div>

          {/* -------------------------------------------------------- derecha */}
          <form onSubmit={handleSubmit} noValidate className="px-5 py-6 md:px-7">
            <h3 className="text-[17px] font-semibold">Contacto</h3>

            <div className="mt-4 space-y-4">
              <div>
                <label htmlFor="co-email" className="block text-[13px] text-[#4b5563]">
                  Correo electrónico
                </label>
                <input
                  id="co-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="Correo electrónico"
                  value={form.email}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setField("email", e.target.value)}
                  onBlur={() => handleBlur("email")}
                  aria-invalid={Boolean(errors.email)}
                  className={`${inputClass} mt-1.5`}
                />
                {errors.email && (
                  <p role="alert" className="mt-1 text-[12px] text-[#c02b2b]">
                    {errors.email}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="co-name" className="block text-[13px] font-semibold text-[#1a1d26]">
                  Nombre completo
                </label>
                <input
                  id="co-name"
                  type="text"
                  autoComplete="name"
                  placeholder="Nombre y apellido"
                  value={form.name}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setField("name", e.target.value)}
                  onBlur={() => handleBlur("name")}
                  aria-invalid={Boolean(errors.name)}
                  className={`${inputClass} mt-1.5`}
                />
                {errors.name && (
                  <p role="alert" className="mt-1 text-[12px] text-[#c02b2b]">
                    {errors.name}
                  </p>
                )}
              </div>
            </div>

            {/* --------------------------------------------- plan de pago */}
            {canPayInInstallments && (
              <div className="mt-6 border-t border-[#eceef2] pt-6">
                <h3 className="text-[17px] font-semibold">Plan de pago</h3>
                <div className="mt-3 overflow-hidden rounded-lg border border-[#d6d9de]">
                  <RadioRow
                    checked={plan === "full"}
                    onChange={() => setPaymentPlan("full")}
                    name="co-plan"
                    label={`Un pago de ${formatUSD(BUNDLE_PRICE_CENTS)}`}
                  />
                  <RadioRow
                    checked={plan === "x3"}
                    onChange={() => setPaymentPlan("x3")}
                    name="co-plan"
                    label={`${INSTALLMENT_COUNT} pagos de ${formatUSD(splitInstallments(BUNDLE_PRICE_CENTS, INSTALLMENT_COUNT)[0] ?? 0)}`}
                    last
                  />
                </div>
              </div>
            )}

            {/* -------------------------------------------- método de pago */}
            <div className="mt-6 border-t border-[#eceef2] pt-6">
              <h3 className="text-[17px] font-semibold">Método de pago</h3>

              <div className="mt-3 overflow-hidden rounded-lg border border-[#d6d9de]">
                <RadioRow
                  checked={method === "card"}
                  onChange={() => setMethod("card")}
                  name="co-method"
                  label="Tarjeta"
                  icon={<CardGlyph />}
                />
                <RadioRow
                  checked={method === "paypal"}
                  onChange={() => setMethod("paypal")}
                  name="co-method"
                  label="PayPal"
                  icon={<PaypalGlyph />}
                  last
                />
              </div>

              {method === "card" ? (
                <div className="mt-4 space-y-3">
                  <div>
                    <input
                      id="co-cardNumber"
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
                      aria-label="Número de tarjeta"
                      className={inputClass}
                    />
                    {errors.cardNumber && (
                      <p role="alert" className="mt-1 text-[12px] text-[#c02b2b]">
                        {errors.cardNumber}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <input
                        id="co-expiry"
                        type="text"
                        inputMode="numeric"
                        autoComplete="cc-exp"
                        placeholder="MM / AA"
                        value={form.expiry}
                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                          setField("expiry", formatExpiry(e.target.value))
                        }
                        onBlur={() => handleBlur("expiry")}
                        aria-invalid={Boolean(errors.expiry)}
                        aria-label="Vencimiento"
                        className={inputClass}
                      />
                      {errors.expiry && (
                        <p role="alert" className="mt-1 text-[12px] text-[#c02b2b]">
                          {errors.expiry}
                        </p>
                      )}
                    </div>
                    <div>
                      <input
                        id="co-cvc"
                        type="text"
                        inputMode="numeric"
                        autoComplete="cc-csc"
                        placeholder="CVC"
                        value={form.cvc}
                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                          setField("cvc", onlyDigits(e.target.value).slice(0, 4))
                        }
                        onBlur={() => handleBlur("cvc")}
                        aria-invalid={Boolean(errors.cvc)}
                        aria-label="CVC"
                        className={inputClass}
                      />
                      {errors.cvc && (
                        <p role="alert" className="mt-1 text-[12px] text-[#c02b2b]">
                          {errors.cvc}
                        </p>
                      )}
                    </div>
                  </div>

                  <label className="flex cursor-pointer items-center gap-2.5 pt-1">
                    <input
                      type="checkbox"
                      checked={saveCard}
                      onChange={(e) => setSaveCard(e.target.checked)}
                      className="h-4 w-4 accent-[#6265fe]"
                    />
                    <span className="text-[13px] text-[#4b5563]">
                      Guardar esta tarjeta para compras futuras
                    </span>
                  </label>
                </div>
              ) : (
                <p className="mt-4 rounded-lg bg-[#f4f5f7] px-4 py-3 text-[13px] leading-relaxed text-[#4b5563]">
                  Al continuar te redirigimos a PayPal para autorizar el pago.
                </p>
              )}
            </div>

            {paymentError && (
              <p
                role="alert"
                className="mt-5 rounded-lg border border-[#e5b4b4] bg-[#fdf2f2] px-4 py-3 text-[13.5px] font-medium text-[#a52222]"
              >
                {paymentError}
              </p>
            )}

            <button
              type="submit"
              disabled={status === "processing"}
              className="mt-6 w-full rounded-full px-6 py-3.5 text-[14.5px] font-semibold transition-[filter] hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
              style={{ backgroundColor: BRAND.action, color: BRAND.actionText }}
            >
              {status === "processing"
                ? "Procesando…"
                : `Pagar USD ${formatAmount(dueTodayCents)} USD`}
            </button>

            <p className="mt-3 flex items-center justify-center gap-1.5 text-[12px] text-[#6b7280]">
              <LockGlyph />
              Las transacciones son seguras y encriptadas
            </p>

            {/* ayuda de demo — no existe en Kajabi */}
            {method === "card" && (
              <div className="mt-5 rounded-lg border border-dashed border-[#d6d9de] px-4 py-3">
                <p className="text-[10.5px] font-semibold tracking-wide text-[#6b7280] uppercase">
                  Tarjetas de prueba (solo demo)
                </p>
                <ul className="mt-1.5 space-y-1">
                  {TEST_CARDS.map((card) => (
                    <li
                      key={card.number}
                      className="flex flex-wrap items-center gap-x-2 text-[12.5px]"
                    >
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
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ átomos */

/**
 * Tarjeta de Order Bump. En Kajabi cada una de estas es un bump configurado
 * dentro de la Offer: imagen, título, descripción enriquecida y precio propio.
 */
function BumpCard({
  selected,
  disabled = false,
  onToggle,
  thumb,
  eyebrow,
  title,
  priceCents,
  listPriceCents,
  badge,
  highlight = false,
  disabledNote,
  children,
}: {
  selected: boolean;
  disabled?: boolean;
  onToggle: () => void;
  thumb: string | undefined;
  eyebrow: string;
  title: string;
  priceCents: number;
  listPriceCents: number;
  badge: string;
  highlight?: boolean;
  disabledNote?: string | undefined;
  children: ReactNode;
}) {
  return (
    <div
      className={`mt-3 rounded-lg border bg-white p-3 transition-colors ${
        selected
          ? "border-[#6265fe] ring-1 ring-[#6265fe]/25"
          : highlight
            ? "border-[#e0a800] bg-[#fffdf6]"
            : "border-[#e3e5e9]"
      } ${disabled ? "opacity-55" : ""}`}
    >
      <div className="flex items-start gap-3">
        {thumb ? (
          <img src={thumb} alt="" className="h-[60px] w-[60px] shrink-0 rounded-md object-cover" />
        ) : (
          <span
            className="h-[60px] w-[60px] shrink-0 rounded-md"
            style={{ backgroundColor: BRAND.action }}
          />
        )}

        <div className="min-w-0 flex-1">
          {/* Sin color propio hereda el del modal, que es el mismo que usa el
              título de abajo. La tarjeta destacada ya se distingue por el borde
              y el fondo, así que no necesita además un eyebrow de otro color. */}
          <p className="text-[10px] font-semibold tracking-[0.08em] uppercase">{eyebrow}</p>
          <p className="mt-0.5 text-[14px] leading-snug font-bold">{title}</p>

          {children}

          <p className="mt-2.5 flex flex-wrap items-baseline gap-2">
            <span className="text-[14px] font-semibold">USD {formatAmount(priceCents)}</span>
            <span className="text-[12.5px] text-[#9aa0ab] line-through">
              {formatUSD(listPriceCents)}
            </span>
            <span className="rounded bg-[#e8f7ef] px-1.5 py-0.5 text-[11px] font-bold text-[#1c7f52]">
              {badge}
            </span>
          </p>

          {disabled && disabledNote && (
            <p className="mt-1.5 text-[11.5px] font-medium text-[#6b7280]">{disabledNote}</p>
          )}
        </div>

        <button
          type="button"
          onClick={onToggle}
          disabled={disabled}
          aria-label={selected ? `Quitar ${title}` : `Agregar ${title}`}
          aria-pressed={selected}
          className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border text-lg leading-none transition-colors ${
            selected
              ? "border-transparent text-white"
              : "border-[#d6d9de] text-[#4b5563] hover:border-[#6265fe] hover:text-[#6265fe]"
          } ${disabled ? "cursor-not-allowed" : ""}`}
          style={selected ? { backgroundColor: BRAND.action } : undefined}
        >
          {selected ? "✓" : "+"}
        </button>
      </div>
    </div>
  );
}

const CurrencyChip = () => (
  <span className="rounded-full border border-[#d6d9de] px-2 py-0.5 text-[11px] font-medium text-[#6b7280]">
    USD
  </span>
);

function RadioRow({
  checked,
  onChange,
  name,
  label,
  icon,
  last = false,
}: {
  checked: boolean;
  onChange: () => void;
  name: string;
  label: string;
  icon?: ReactNode;
  last?: boolean;
}) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors ${
        last ? "" : "border-b border-[#e6e8ec]"
      } ${checked ? "bg-[#f6f6ff]" : "bg-white"}`}
    >
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 shrink-0 accent-[#6265fe]"
      />
      {icon}
      <span className="text-[14px]">{label}</span>
    </label>
  );
}

const CardGlyph = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-6 shrink-0" aria-hidden="true">
    <rect x="2" y="5" width="20" height="14" rx="2.5" fill="#e6e8ec" />
    <rect x="2" y="8.5" width="20" height="2.5" fill="#9aa0ab" />
  </svg>
);

const PaypalGlyph = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-6 shrink-0" aria-hidden="true">
    <rect x="2" y="4" width="20" height="16" rx="3" fill="#f0f3ff" />
    <path
      d="M9 17l1.1-7h3.1c1.7 0 2.7.9 2.4 2.5-.3 1.7-1.6 2.6-3.4 2.6h-1l-.3 1.9H9z"
      fill="#1e3a8a"
    />
  </svg>
);

const LockGlyph = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3 w-3">
    <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
    <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
  </svg>
);

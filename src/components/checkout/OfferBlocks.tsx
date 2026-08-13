/**
 * Upsell y downsell del funnel.
 *
 * Upsell  → aparece cuando hay cursos sueltos en el carrito. Acredita lo que
 *           ya lleva contra el precio del bundle, así solo paga la diferencia.
 * Downsell → aparece únicamente si rechazó el upsell. Mismo bundle, pero en
 *           3 cuotas sin recargo.
 *
 * Los dos se usan igual en el carrito lateral y en la página de checkout.
 */

import {
  BUNDLE_PRICE_CENTS,
  CATALOG_VALUE_CENTS,
  INSTALLMENT_COUNT,
  formatUSD,
  splitInstallments,
} from "@/lib/catalog";
import { useCart } from "@/lib/cart";

const Arrow = () => <span aria-hidden="true">→</span>;

/* ------------------------------------------------------------------ upsell */

export function UpsellOffer({ compact = false }: { compact?: boolean }) {
  const { upgrade, subtotalCents, acceptUpsell, declineUpsell } = useCart();
  const { missingCourses, upgradeCostCents, savingsCents, discountPercent } = upgrade;

  // Ya tiene los 5 sueltos: no hay nada que sumar, solo conviene el precio.
  const hasEveryCourse = missingCourses.length === 0;
  const savings = hasEveryCourse ? subtotalCents - BUNDLE_PRICE_CENTS : savingsCents;
  const percent = hasEveryCourse ? Math.round((savings / subtotalCents) * 100) : discountPercent;
  const isFree = upgradeCostCents === 0;

  const missingValueCents = missingCourses.reduce((sum, c) => sum + c.priceCents, 0);

  return (
    <div className="card-indigo relative rounded-2xl p-5 sm:p-6">
      <span className="card-red absolute -top-3 left-5 rounded-full px-4 py-1.5 text-[10px] font-bold tracking-[0.16em] text-foreground uppercase">
        Oferta solo en el carrito
      </span>

      <p className="eyebrow mt-3 text-foreground/80">Mejora tu compra</p>

      {hasEveryCourse ? (
        <h3 className="display mt-3 text-[clamp(1.15rem,3.4vw,1.6rem)]">
          Llevas los 5 cursos sueltos. Pásalos al bundle y paga{" "}
          <span className="text-lime">{formatUSD(BUNDLE_PRICE_CENTS)}</span> en vez de{" "}
          <span className="line-through">{formatUSD(subtotalCents)}</span>.
        </h3>
      ) : isFree ? (
        <h3 className="display mt-3 text-[clamp(1.15rem,3.4vw,1.6rem)]">
          Suma los otros {missingCourses.length} cursos{" "}
          <span className="text-lime">sin costo extra</span>.
        </h3>
      ) : (
        <h3 className="display mt-3 text-[clamp(1.15rem,3.4vw,1.6rem)]">
          Suma los otros {missingCourses.length} cursos por solo{" "}
          <span className="text-lime">{formatUSD(upgradeCostCents)}</span> más.
        </h3>
      )}

      <p className="mt-3 text-sm leading-relaxed text-foreground/85">
        {hasEveryCourse ? (
          <>
            Es el mismo contenido, al precio del paquete completo. Te ahorras{" "}
            <strong className="text-foreground">{formatUSD(savings)}</strong>.
          </>
        ) : (
          <>
            Por separado te costarían{" "}
            <span className="line-through">{formatUSD(missingValueCents)}</span>. Te acreditamos lo
            que ya llevas y completas el bundle de {formatUSD(BUNDLE_PRICE_CENTS)}.
          </>
        )}
      </p>

      {/* franja de ahorro */}
      <div className="mt-5 flex flex-wrap items-center gap-3 rounded-xl bg-ink/45 px-4 py-3">
        <span className="display text-2xl text-lime md:text-3xl">-{percent}%</span>
        <span className="text-[11px] leading-tight font-semibold tracking-[0.1em] text-foreground/80 uppercase">
          Ahorras {formatUSD(savings)}
          <br />
          en esta compra
        </span>
      </div>

      {!compact && !hasEveryCourse && missingCourses.length > 0 && (
        <ul className="mt-5 space-y-2.5">
          {missingCourses.map((course) => (
            <li
              key={course.id}
              className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3"
            >
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-lime text-[10px] leading-none font-bold text-ink">
                +
              </span>
              <span className="min-w-0 truncate text-sm text-foreground/90">{course.short}</span>
              <span className="text-xs font-bold text-foreground/60 line-through">
                {formatUSD(course.priceCents)}
              </span>
            </li>
          ))}
        </ul>
      )}

      <button type="button" onClick={acceptUpsell} className="btn-lime btn-sweep mt-6 w-full">
        {isFree || hasEveryCourse ? (
          <>
            Sí, quiero el bundle completo <Arrow />
          </>
        ) : (
          <>
            Sí, agregar por {formatUSD(upgradeCostCents)} <Arrow />
          </>
        )}
      </button>

      <button
        type="button"
        onClick={declineUpsell}
        className="mt-3 w-full text-center text-xs font-semibold tracking-wide text-foreground/60 underline underline-offset-4 transition-colors hover:text-foreground/90"
      >
        No gracias, sigo con lo que ya elegí
      </button>
    </div>
  );
}

/* ---------------------------------------------------------------- downsell */

export function DownsellOffer({ compact = false }: { compact?: boolean }) {
  const { acceptDownsell, dismissDownsell } = useCart();
  const installments = splitInstallments(BUNDLE_PRICE_CENTS, INSTALLMENT_COUNT);
  const firstPayment = installments[0] ?? 0;

  return (
    <div className="card-ink relative rounded-2xl border border-lime/45 p-5 sm:p-6">
      <span className="absolute -top-3 left-5 rounded-full bg-lime px-4 py-1.5 text-[10px] font-bold tracking-[0.16em] text-ink uppercase">
        Espera — última opción
      </span>

      <p className="eyebrow mt-3 text-foreground/70">¿El precio es el problema?</p>

      <h3 className="display mt-3 text-[clamp(1.15rem,3.4vw,1.6rem)]">
        Llévate el bundle completo en{" "}
        <span className="text-lime">
          {INSTALLMENT_COUNT} pagos de {formatUSD(firstPayment)}
        </span>
        .
      </h3>

      <p className="mt-3 text-sm leading-relaxed text-foreground/85">
        Los 5 cursos, acceso inmediato desde el primer pago y{" "}
        <strong className="text-foreground">sin recargo</strong>: son los mismos{" "}
        {formatUSD(BUNDLE_PRICE_CENTS)}, repartidos en {INSTALLMENT_COUNT} meses.
      </p>

      {!compact && (
        <ol className="mt-5 grid grid-cols-3 gap-2">
          {installments.map((amount, i) => (
            <li key={i} className="rounded-lg bg-ink/60 px-2 py-3 text-center ring-1 ring-white/10">
              <span className="block text-[9px] font-bold tracking-[0.14em] text-foreground/55 uppercase">
                {i === 0 ? "Hoy" : `Mes ${i + 1}`}
              </span>
              <span className="mt-1.5 block text-sm font-bold">{formatUSD(amount)}</span>
            </li>
          ))}
        </ol>
      )}

      <p className="mt-4 text-xs text-foreground/60">
        Valor de catálogo <span className="line-through">{formatUSD(CATALOG_VALUE_CENTS)}</span> ·
        Total del plan {formatUSD(BUNDLE_PRICE_CENTS)}
      </p>

      <button type="button" onClick={acceptDownsell} className="btn-lime btn-sweep mt-6 w-full">
        Sí, quiero pagar en {INSTALLMENT_COUNT} cuotas <Arrow />
      </button>

      <button
        type="button"
        onClick={dismissDownsell}
        className="mt-3 w-full text-center text-xs font-semibold tracking-wide text-foreground/60 underline underline-offset-4 transition-colors hover:text-foreground/90"
      >
        No, gracias — continuar con mi compra
      </button>
    </div>
  );
}

/** Renderiza el paso del funnel que corresponda, o nada. */
export function FunnelOffer({ compact = false }: { compact?: boolean }) {
  const { showUpsell, showDownsell } = useCart();
  if (showUpsell) return <UpsellOffer compact={compact} />;
  if (showDownsell) return <DownsellOffer compact={compact} />;
  return null;
}

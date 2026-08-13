/**
 * Carrito lateral. Es donde vive el funnel: lista los productos y, debajo,
 * muestra el upsell del bundle o —si ya lo rechazó— el downsell de 3 cuotas.
 */

import { Link } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

import { BUNDLE, INSTALLMENT_COUNT, formatUSD } from "@/lib/catalog";
import { useCart, useScrollLock } from "@/lib/cart";
import { FunnelOffer } from "./OfferBlocks";

const Arrow = () => <span aria-hidden="true">→</span>;

/* ------------------------------------------------------- botón del header */

export function CartButton({ className = "" }: { className?: string }) {
  const { itemCount, open, hydrated } = useCart();

  return (
    <button
      type="button"
      onClick={open}
      aria-label={`Abrir carrito (${itemCount} ${itemCount === 1 ? "producto" : "productos"})`}
      className={`relative grid h-10 w-10 shrink-0 place-items-center rounded-lg text-foreground transition-colors hover:bg-white/10 ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="h-5 w-5"
      >
        <path d="M3 5h2.2l1.9 10.2a1.5 1.5 0 0 0 1.5 1.2h8.1a1.5 1.5 0 0 0 1.5-1.2L20 8H6.4" />
        <circle cx="9.5" cy="20" r="1.3" fill="currentColor" stroke="none" />
        <circle cx="17" cy="20" r="1.3" fill="currentColor" stroke="none" />
      </svg>
      {hydrated && itemCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-lime px-1 text-[10px] font-bold text-ink">
          {itemCount}
        </span>
      )}
    </button>
  );
}

/* ------------------------------------------------------------------ drawer */

export function CartDrawer() {
  const cart = useCart();
  const { isOpen, close, lines, isEmpty, subtotalCents, paymentPlan, dueTodayCents, hasBundle } =
    cart;

  const closeRef = useRef<HTMLButtonElement>(null);

  useScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) return;
    closeRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, close]);

  if (!isOpen) return null;

  const inThreePayments = hasBundle && paymentPlan === "x3";

  return (
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-label="Tu carrito">
      <button
        type="button"
        aria-label="Cerrar carrito"
        onClick={close}
        className="animate-in fade-in absolute inset-0 bg-ink/75 backdrop-blur-sm duration-200"
      />

      <div className="animate-in slide-in-from-right absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-navy-deep shadow-2xl duration-300 ease-out">
        <div
          className="grid-lines-dark pointer-events-none absolute inset-0 opacity-60"
          aria-hidden="true"
        />

        {/* header */}
        <div className="relative grid shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-white/12 px-5 py-4">
          <div className="min-w-0">
            <p className="eyebrow text-foreground/60">Tu carrito</p>
            <p className="mt-1 truncate text-lg font-bold">
              {isEmpty
                ? "Está vacío"
                : `${lines.length} ${lines.length === 1 ? "producto" : "productos"}`}
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={close}
            aria-label="Cerrar carrito"
            className="grid h-9 w-9 place-items-center rounded-lg text-foreground/70 transition-colors hover:bg-white/10 hover:text-foreground"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              className="h-5 w-5"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {/* body */}
        <div className="relative min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {isEmpty ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <p className="text-base font-bold">Todavía no elegiste ningún curso.</p>
              <p className="mt-2 max-w-xs text-sm text-foreground/70">
                Elige un curso suelto o llévate el bundle completo con los 5.
              </p>
              <button type="button" onClick={close} className="btn-lime btn-sweep mt-7">
                Ver los cursos <Arrow />
              </button>
            </div>
          ) : (
            <>
              <ul className="space-y-3">
                {lines.map((line) => (
                  <li
                    key={line.id}
                    className="card-ink grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 rounded-xl p-3"
                  >
                    {line.thumb ? (
                      <img
                        src={line.thumb}
                        alt=""
                        className="h-14 w-14 shrink-0 rounded-lg object-cover opacity-80"
                      />
                    ) : (
                      <span className="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-lime text-lg font-bold text-ink">
                        5
                      </span>
                    )}

                    <div className="min-w-0">
                      <p className="text-sm leading-tight font-bold text-pretty">{line.title}</p>
                      <p className="mt-1 text-xs leading-snug text-foreground/65">{line.desc}</p>
                      {line.isBundle && (
                        <p className="mt-1.5 text-[11px] font-bold tracking-wide text-lime uppercase">
                          Incluye los 5 cursos
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <span className="text-sm font-bold whitespace-nowrap">
                        {formatUSD(line.priceCents)}
                      </span>
                      <button
                        type="button"
                        onClick={() => cart.remove(line.id)}
                        aria-label={`Quitar ${line.title}`}
                        className="text-[11px] text-foreground/50 underline underline-offset-2 transition-colors hover:text-destructive"
                      >
                        Quitar
                      </button>
                    </div>
                  </li>
                ))}
              </ul>

              {hasBundle && (
                <ul className="mt-4 space-y-2 rounded-xl bg-ink/50 px-4 py-4 ring-1 ring-white/10">
                  {BUNDLE.perks.map((perk) => (
                    <li key={perk} className="flex items-start gap-2.5 text-xs text-foreground/85">
                      <span className="mt-px text-lime">✓</span>
                      {perk}
                    </li>
                  ))}
                </ul>
              )}

              {/* upsell → downsell */}
              <div className="mt-7">
                <FunnelOffer />
              </div>
            </>
          )}
        </div>

        {/* footer */}
        {!isEmpty && (
          <div className="relative shrink-0 border-t border-white/12 bg-ink/85 px-5 py-5 backdrop-blur">
            {inThreePayments ? (
              <>
                <div className="flex items-baseline justify-between text-sm text-foreground/75">
                  <span>Plan de {INSTALLMENT_COUNT} cuotas sin recargo</span>
                  <span>{formatUSD(subtotalCents)}</span>
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-sm font-bold">Hoy pagas</span>
                  <span className="display text-3xl text-lime">{formatUSD(dueTodayCents)}</span>
                </div>
              </>
            ) : (
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-bold">Total</span>
                <span className="display text-3xl">{formatUSD(subtotalCents)}</span>
              </div>
            )}

            <Link to="/checkout" onClick={close} className="btn-lime btn-sweep mt-4 w-full">
              Ir al pago <Arrow />
            </Link>

            <button
              type="button"
              onClick={close}
              className="mt-3 w-full text-center text-xs font-semibold tracking-wide text-foreground/55 transition-colors hover:text-foreground/85"
            >
              Seguir viendo cursos
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

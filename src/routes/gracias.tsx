import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { CheckoutShell } from "@/components/checkout/CheckoutShell";
import { INSTALLMENT_COUNT, formatUSD } from "@/lib/catalog";
import { formatOrderDate, recallOrder, type Order } from "@/lib/orders";

export const Route = createFileRoute("/gracias")({
  head: () => ({
    meta: [
      { title: "¡Listo! Ya estás dentro — Francisco en las Redes University" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ThankYouPage,
});

const Arrow = () => <span aria-hidden="true">→</span>;

function ThankYouPage() {
  // La orden vive en sessionStorage, así que solo existe en el cliente.
  const [order, setOrder] = useState<Order | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setOrder(recallOrder());
    setLoaded(true);
  }, []);

  if (!loaded) {
    return (
      <CheckoutShell>
        <div className="grid min-h-[40vh] place-items-center">
          <p className="text-sm text-foreground/50">Confirmando tu compra…</p>
        </div>
      </CheckoutShell>
    );
  }

  if (!order) {
    return (
      <CheckoutShell>
        <div className="card-ink mx-auto max-w-lg rounded-2xl p-8 text-center sm:p-10">
          <h1 className="display text-2xl">No encontramos tu compra</h1>
          <p className="mt-3 text-sm leading-relaxed text-foreground/75">
            Puede que hayas recargado la página en otra pestaña o sesión. Si acabas de pagar, revisa
            tu email: ahí están los accesos.
          </p>
          <Link to="/" className="btn-lime btn-sweep mt-7">
            Volver al inicio <Arrow />
          </Link>
        </div>
      </CheckoutShell>
    );
  }

  const isThreePayments = order.paymentPlan === "x3";
  const pending = order.installments.filter((i) => i.status === "programado");

  return (
    <CheckoutShell>
      <div className="mx-auto max-w-2xl">
        {/* confirmación */}
        <div className="text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-lime text-3xl leading-none text-ink">
            ✓
          </span>
          <p className="eyebrow mt-6 text-lime">Pago aprobado</p>
          <h1 className="display mt-4 text-[clamp(1.9rem,5vw,3rem)]">
            ¡Listo, {order.customer.name.split(" ")[0]}! Ya estás dentro.
          </h1>
          <p className="mx-auto mt-5 max-w-lg text-[15px] leading-relaxed text-pretty text-foreground/80">
            Te mandamos los accesos a{" "}
            <strong className="text-foreground">{order.customer.email}</strong>. Puedes empezar a
            ver el contenido ahora mismo.
          </p>
        </div>

        {/* detalle */}
        <div className="card-ink mt-10 rounded-2xl p-5 sm:p-7">
          <div className="grid grid-cols-2 gap-4 border-b border-white/12 pb-5 sm:grid-cols-4">
            <Detail label="Orden" value={order.id} mono />
            <Detail label="Fecha" value={formatOrderDate(order.createdAt)} />
            <Detail label="Método" value={`${order.card.brand} ···· ${order.card.last4}`} />
            <Detail
              label="Plan"
              value={isThreePayments ? `${INSTALLMENT_COUNT} cuotas` : "Pago único"}
            />
          </div>

          <ul className="mt-5 space-y-4">
            {order.lines.map((line) => (
              <li key={line.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                <span className="min-w-0 text-sm leading-tight font-bold text-pretty">
                  {line.title}
                </span>
                <span className="text-sm font-bold whitespace-nowrap">
                  {formatUSD(line.priceCents)}
                </span>
              </li>
            ))}
          </ul>

          {isThreePayments ? (
            <div className="mt-5 border-t border-white/12 pt-5">
              <p className="text-[11px] font-bold tracking-[0.12em] text-lime uppercase">
                Calendario de pagos
              </p>
              <ol className="mt-3 space-y-2.5">
                {order.installments.map((installment) => (
                  <li
                    key={installment.n}
                    className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 text-sm"
                  >
                    <span
                      className={`grid h-6 w-6 place-items-center rounded-full text-[10px] font-bold ${
                        installment.status === "cobrado"
                          ? "bg-lime text-ink"
                          : "bg-white/10 text-foreground/70"
                      }`}
                    >
                      {installment.status === "cobrado" ? "✓" : installment.n}
                    </span>
                    <span className="min-w-0 text-foreground/75">
                      {installment.status === "cobrado" ? "Cobrado hoy" : "Programado"} ·{" "}
                      {formatOrderDate(installment.dueDate)}
                    </span>
                    <span className="font-bold whitespace-nowrap">
                      {formatUSD(installment.amountCents)}
                    </span>
                  </li>
                ))}
              </ol>
              <div className="mt-4 flex items-baseline justify-between border-t border-white/12 pt-4">
                <span className="text-sm font-bold">Cobrado hoy</span>
                <span className="display text-3xl text-lime">{formatUSD(order.dueTodayCents)}</span>
              </div>
              {pending.length > 0 && (
                <p className="mt-3 text-xs text-foreground/50">
                  Quedan {pending.length}{" "}
                  {pending.length === 1 ? "cuota programada" : "cuotas programadas"} por un total de{" "}
                  {formatUSD(pending.reduce((sum, i) => sum + i.amountCents, 0))}. Sin recargo.
                </p>
              )}
            </div>
          ) : (
            <div className="mt-5 flex items-baseline justify-between border-t border-white/12 pt-5">
              <span className="text-sm font-bold">Total pagado</span>
              <span className="display text-3xl text-lime">{formatUSD(order.totalCents)}</span>
            </div>
          )}
        </div>

        {/* recorrido del funnel — útil para mostrarle el mecanismo al cliente */}
        <div className="mt-6 rounded-2xl bg-indigo/12 p-5 ring-1 ring-indigo-soft/25 sm:p-6">
          <p className="text-[11px] font-bold tracking-[0.12em] text-periwinkle uppercase">
            Recorrido de esta compra
          </p>
          <ul className="mt-3 space-y-2 text-sm text-foreground/80">
            <FunnelStep done={order.funnel.upsellShown} label="Se mostró el upsell del bundle" />
            <FunnelStep
              done={order.funnel.upsellAccepted}
              label="Aceptó el upsell (bundle en pago único)"
            />
            <FunnelStep
              done={order.funnel.downsellShown}
              label="Se mostró el downsell de 3 cuotas"
            />
            <FunnelStep
              done={order.funnel.downsellAccepted}
              label={`Aceptó el downsell (${INSTALLMENT_COUNT} cuotas)`}
            />
          </ul>
          <p className="mt-4 text-[11px] leading-relaxed text-foreground/45">
            Este bloque existe solo en la demo, para ver qué pasos del funnel se dispararon en cada
            recorrido. En producción no se muestra al comprador.
          </p>
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link to="/" className="btn-lime btn-sweep">
            Volver al inicio <Arrow />
          </Link>
        </div>
      </div>
    </CheckoutShell>
  );
}

function Detail({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-bold tracking-[0.14em] text-foreground/50 uppercase">
        {label}
      </p>
      <p className={`mt-1.5 truncate text-sm font-bold ${mono ? "font-mono tracking-wide" : ""}`}>
        {value}
      </p>
    </div>
  );
}

function FunnelStep({ done, label }: { done: boolean; label: string }) {
  return (
    <li className="flex items-start gap-2.5">
      <span
        className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full text-[9px] leading-none ${
          done ? "bg-lime text-ink" : "bg-white/10 text-foreground/40"
        }`}
      >
        {done ? "✓" : "—"}
      </span>
      <span className={done ? "" : "text-foreground/45"}>{label}</span>
    </li>
  );
}

import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { PipelineShell } from "@/components/checkout/CheckoutShell";
import { INSTALLMENT_COUNT, formatUSD } from "@/lib/catalog";
import { formatOrderDate, loadSession, type Order, type PurchaseSession } from "@/lib/orders";

export const Route = createFileRoute("/gracias")({
  head: () => ({
    meta: [
      { title: "¡Listo! Ya estás dentro — Francisco en las Redes University" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ThankYouPage,
});

function ThankYouPage() {
  // La compra vive en sessionStorage, así que solo existe en el cliente.
  const [session, setSession] = useState<PurchaseSession | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setSession(loadSession());
    setLoaded(true);
  }, []);

  if (!loaded) {
    return (
      <PipelineShell>
        <div className="grid min-h-[40vh] place-items-center">
          <p className="text-sm text-foreground/50">Confirmando tu compra…</p>
        </div>
      </PipelineShell>
    );
  }

  if (!session) {
    return (
      <PipelineShell>
        <div className="card-ink mx-auto max-w-lg rounded-2xl p-8 text-center sm:p-10">
          <h1 className="display text-2xl">No encontramos tu compra</h1>
          <p className="mt-3 text-sm leading-relaxed text-foreground/75">
            Puede que hayas recargado la página en otra pestaña o sesión. Si acabas de pagar, revisa
            tu email: ahí están los accesos.
          </p>
          <Link to="/" className="btn-lime btn-sweep mt-7">
            Volver al inicio
          </Link>
        </div>
      </PipelineShell>
    );
  }

  const orders = [session.main, session.upsellOrder].filter((o): o is Order => Boolean(o));
  const firstName = session.main.customer.name.split(" ")[0];
  const chargedTodayCents = orders.reduce((sum, o) => sum + o.dueTodayCents, 0);

  return (
    <PipelineShell>
      <div className="text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-lime text-3xl leading-none text-ink">
          ✓
        </span>
        <p className="eyebrow mt-6 text-lime">Pago aprobado</p>
        <h1 className="display mt-4 text-[clamp(1.9rem,5vw,3rem)]">
          ¡Listo, {firstName}! Ya estás dentro.
        </h1>
        <p className="mx-auto mt-5 max-w-lg text-[15px] leading-relaxed text-pretty text-foreground/80">
          Te mandamos los accesos a{" "}
          <strong className="text-foreground">{session.main.customer.email}</strong>. Puedes empezar
          a ver el contenido ahora mismo.
        </p>
      </div>

      {/* En Kajabi el upsell se cobra aparte, así que son dos recibos. */}
      {orders.map((order) => (
        <OrderCard key={order.id} order={order} />
      ))}

      {orders.length > 1 && (
        <div className="mt-4 flex items-baseline justify-between rounded-2xl bg-lime px-6 py-4 text-ink">
          <span className="text-sm font-bold">Cobrado hoy en total</span>
          <span className="display text-2xl">{formatUSD(chargedTodayCents)}</span>
        </div>
      )}

      {/* Recorrido del pipeline — solo para explicarle el mecanismo al cliente */}
      <div className="mt-6 rounded-2xl bg-indigo/12 p-5 ring-1 ring-indigo-soft/25 sm:p-6">
        <p className="text-[11px] font-bold tracking-[0.12em] text-periwinkle uppercase">
          Recorrido de esta compra
        </p>
        <ul className="mt-3 space-y-2 text-sm text-foreground/80">
          <Step
            done={session.pipeline.bumpOffered}
            label="Se mostró el Order Bump en el checkout"
          />
          <Step done={session.pipeline.bumpTaken} label="Marcó el Order Bump" />
          <Step done={session.pipeline.upsellShown} label="Se mostró el upsell post-compra" />
          <Step done={session.pipeline.upsellAccepted} label="Aceptó el upsell" />
          <Step done={session.pipeline.downsellShown} label="Se mostró el downsell" />
          <Step
            done={session.pipeline.downsellAccepted}
            label={`Aceptó el downsell (${INSTALLMENT_COUNT} cuotas)`}
          />
        </ul>
        <p className="mt-4 text-[11px] leading-relaxed text-foreground/45">
          Este bloque existe solo en la demo. En producción no se le muestra al comprador.
        </p>
      </div>

      <div className="mt-8 flex justify-center">
        <Link to="/" className="btn-lime btn-sweep">
          Volver al inicio
        </Link>
      </div>
    </PipelineShell>
  );
}

function OrderCard({ order }: { order: Order }) {
  const isInstallments = order.paymentPlan === "x3";
  const pending = order.installments.filter((i) => i.status === "programado");

  return (
    <div className="card-ink mt-8 rounded-2xl p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/12 pb-4">
        <div>
          <p className="text-[10px] font-bold tracking-[0.14em] text-foreground/50 uppercase">
            {order.kind === "principal" ? "Compra" : "Oferta añadida"}
          </p>
          <p className="mt-1 font-mono text-sm font-bold tracking-wide">{order.id}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold tracking-[0.14em] text-foreground/50 uppercase">
            {formatOrderDate(order.createdAt)}
          </p>
          <p className="mt-1 text-sm font-bold">
            {order.card.brand} ···· {order.card.last4}
          </p>
        </div>
      </div>

      <ul className="mt-4 space-y-3">
        {order.lines.map((line) => (
          <li key={line.id} className="flex items-start justify-between gap-3">
            <span className="min-w-0 text-sm leading-tight font-bold text-pretty">
              {line.title}
            </span>
            <span className="text-sm font-bold whitespace-nowrap">
              {formatUSD(line.priceCents)}
            </span>
          </li>
        ))}
      </ul>

      {isInstallments ? (
        <div className="mt-5 border-t border-white/12 pt-5">
          <p className="text-[11px] font-bold tracking-[0.12em] text-lime uppercase">
            Plan de {INSTALLMENT_COUNT} pagos sin recargo
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
          {pending.length > 0 && (
            <p className="mt-3 text-xs text-foreground/50">
              Quedan {pending.length}{" "}
              {pending.length === 1 ? "cuota programada" : "cuotas programadas"} por{" "}
              {formatUSD(pending.reduce((sum, i) => sum + i.amountCents, 0))}. Sin recargo.
            </p>
          )}
        </div>
      ) : (
        <div className="mt-5 flex items-baseline justify-between border-t border-white/12 pt-5">
          <span className="text-sm font-bold">Total pagado</span>
          <span className="display text-2xl text-lime">{formatUSD(order.totalCents)}</span>
        </div>
      )}
    </div>
  );
}

function Step({ done, label }: { done: boolean; label: string }) {
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

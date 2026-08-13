import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { PipelineShell } from "@/components/checkout/CheckoutShell";
import {
  BUNDLE_PRICE_CENTS,
  INSTALLMENT_COUNT,
  calcUpgrade,
  formatUSD,
  splitInstallments,
} from "@/lib/catalog";
import { loadSession, saveSession, submitUpsell, type PurchaseSession } from "@/lib/orders";

/**
 * Downsell post-compra (one-click).
 *
 * Segundo paso del Sales Pipeline de Kajabi: se muestra solo a quien rechazó
 * el upsell. Misma oferta, repartida en 3 pagos sin recargo.
 */
export const Route = createFileRoute("/oferta-final")({
  head: () => ({
    meta: [
      { title: "Última oportunidad | Francisco en las Redes University" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DownsellPage,
});

function DownsellPage() {
  const navigate = useNavigate();
  const [session, setSession] = useState<PurchaseSession | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState<"idle" | "processing">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = loadSession();
    setSession(stored);
    setLoaded(true);

    if (!stored) {
      void navigate({ to: "/" });
      return;
    }
    if (stored.ownsBundle) {
      void navigate({ to: "/gracias" });
      return;
    }

    saveSession({ ...stored, pipeline: { ...stored.pipeline, downsellShown: true } });
  }, [navigate]);

  if (!loaded || !session || session.ownsBundle) {
    return (
      <PipelineShell>
        <div className="grid min-h-[40vh] place-items-center">
          <p className="text-sm text-foreground/50">Un momento…</p>
        </div>
      </PipelineShell>
    );
  }

  const upgrade = calcUpgrade(session.baseOffer);
  const installments = splitInstallments(upgrade.upgradeCostCents, INSTALLMENT_COUNT);

  const accept = async () => {
    if (status === "processing") return;
    setStatus("processing");
    setError(null);

    try {
      const result = await submitUpsell({
        data: {
          baseOffer: session.baseOffer,
          paymentPlan: "x3",
          step: "downsell",
          customer: session.main.customer,
          card: session.main.card,
        },
      });

      if (!result.ok) {
        setError(result.error);
        setStatus("idle");
        return;
      }

      saveSession({
        ...session,
        upsellOrder: result.order,
        ownsBundle: true,
        pipeline: { ...session.pipeline, downsellShown: true, downsellAccepted: true },
      });
      await navigate({ to: "/gracias" });
    } catch {
      setError("No pudimos procesar el cobro. Intenta de nuevo.");
      setStatus("idle");
    }
  };

  const decline = async () => {
    await navigate({ to: "/gracias" });
  };

  return (
    <PipelineShell>
      <div className="text-center">
        <p className="inline-block rounded-full bg-alert px-4 py-1.5 text-[11px] font-bold tracking-[0.14em] text-foreground uppercase">
          Última oportunidad
        </p>

        <h1 className="display mt-7 text-[clamp(1.8rem,5vw,2.9rem)]">
          ¿Y si lo divides en {INSTALLMENT_COUNT} pagos?
        </h1>

        <p className="mx-auto mt-5 max-w-xl text-[16px] leading-relaxed text-pretty text-foreground/85">
          Entendido, {formatUSD(upgrade.upgradeCostCents)} de una vez no siempre entra en el
          presupuesto. Llévate los otros {upgrade.missingCourses.length} cursos igual, repartidos en{" "}
          {INSTALLMENT_COUNT} meses y <strong className="text-foreground">sin recargo</strong>.
        </p>
      </div>

      <div className="card-ink mt-9 rounded-2xl border border-lime/40 p-6 sm:p-8">
        <div className="text-center">
          <p className="text-[13px] text-foreground/70">Hoy pagas solo</p>
          <p className="display mt-3 text-[clamp(2.6rem,8vw,4rem)] text-lime">
            {formatUSD(installments[0] ?? 0)}
          </p>
          <p className="mt-2 text-[13px] text-foreground/60">
            y {INSTALLMENT_COUNT - 1} pagos más — {formatUSD(upgrade.upgradeCostCents)} en total,
            igual que antes
          </p>
        </div>

        <ol className="mt-7 grid grid-cols-3 gap-2">
          {installments.map((amount, i) => (
            <li key={i} className="rounded-lg bg-ink/60 px-2 py-3 text-center ring-1 ring-white/10">
              <span className="block text-[9px] font-bold tracking-[0.14em] text-foreground/55 uppercase">
                {i === 0 ? "Hoy" : `Mes ${i + 1}`}
              </span>
              <span className="mt-1.5 block text-[15px] font-bold">{formatUSD(amount)}</span>
            </li>
          ))}
        </ol>

        <p className="mt-6 text-center text-[13px] text-foreground/65">
          Acceso completo a los 5 cursos desde el primer pago. Bundle de{" "}
          {formatUSD(BUNDLE_PRICE_CENTS)} completado.
        </p>

        {error && (
          <p
            role="alert"
            className="mt-5 rounded-lg border border-destructive/60 bg-destructive/15 px-4 py-3 text-sm font-semibold"
          >
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={accept}
          disabled={status === "processing"}
          className="btn-lime btn-sweep mt-7 w-full disabled:cursor-not-allowed disabled:opacity-70"
        >
          {status === "processing"
            ? "Procesando…"
            : `Sí, quiero pagar en ${INSTALLMENT_COUNT} cuotas`}
        </button>

        <p className="mt-3 text-center text-[12px] text-foreground/50">
          Un solo clic — se cobra a la tarjeta ···· {session.main.card.last4} que ya usaste.
        </p>

        <button
          type="button"
          onClick={decline}
          disabled={status === "processing"}
          className="mt-5 w-full text-center text-[13px] text-foreground/55 underline underline-offset-4 transition-colors hover:text-foreground/85"
        >
          No, gracias. Ir a mi curso.
        </button>
      </div>
    </PipelineShell>
  );
}

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { PipelineShell } from "@/components/checkout/CheckoutShell";
import { BUNDLE_PRICE_CENTS, calcUpgrade, formatUSD } from "@/lib/catalog";
import { loadSession, saveSession, submitUpsell, type PurchaseSession } from "@/lib/orders";

/**
 * Upsell post-compra (one-click).
 *
 * En Kajabi esto es una página normal del page builder dentro del Sales
 * Pipeline: aparece después de pagar y el botón cobra a la tarjeta que ya
 * quedó guardada, sin volver a pedir datos. Por eso acá no hay formulario.
 */
export const Route = createFileRoute("/oferta")({
  head: () => ({
    meta: [
      { title: "Espera — una última oferta | Francisco En Las Redes University" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: UpsellPage,
});

function UpsellPage() {
  const navigate = useNavigate();
  const [session, setSession] = useState<PurchaseSession | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState<"idle" | "processing">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = loadSession();
    setSession(stored);
    setLoaded(true);

    // Sin compra previa, o si ya tiene los 5 cursos, esta página no aplica.
    if (!stored) {
      void navigate({ to: "/" });
      return;
    }
    if (stored.ownsBundle) {
      void navigate({ to: "/gracias" });
      return;
    }

    saveSession({ ...stored, pipeline: { ...stored.pipeline, upsellShown: true } });
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

  const accept = async () => {
    if (status === "processing") return;
    setStatus("processing");
    setError(null);

    try {
      const result = await submitUpsell({
        data: {
          baseOffer: session.baseOffer,
          paymentPlan: "full",
          step: "upsell",
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
        pipeline: { ...session.pipeline, upsellShown: true, upsellAccepted: true },
      });
      await navigate({ to: "/gracias" });
    } catch {
      setError("No pudimos procesar el cobro. Intenta de nuevo.");
      setStatus("idle");
    }
  };

  const decline = async () => {
    saveSession({ ...session, pipeline: { ...session.pipeline, upsellShown: true } });
    await navigate({ to: "/oferta-final" });
  };

  return (
    <PipelineShell>
      <div className="text-center">
        <p className="inline-block rounded-full bg-lime px-4 py-1.5 text-[11px] font-bold tracking-[0.14em] text-ink uppercase">
          Tu compra fue aprobada
        </p>

        <h1 className="display mt-7 text-[clamp(1.8rem,5vw,2.9rem)]">
          Espera — no cierres esta página.
        </h1>

        <p className="mx-auto mt-5 max-w-xl text-[16px] leading-relaxed text-pretty text-foreground/85">
          Ya tienes tu curso. Por ser cliente, puedes sumar los otros{" "}
          {upgrade.missingCourses.length} y completar el bundle por una diferencia mínima. Esta
          oferta solo aparece una vez.
        </p>
      </div>

      {/* Detalle de cada curso que se suma — es lo que el equipo necesita ver */}
      <ul className="mt-9 grid gap-3 sm:grid-cols-2">
        {upgrade.missingCourses.map((course) => (
          <li key={course.id} className="card-ink flex items-start gap-3 rounded-xl p-3">
            <img
              src={course.thumb}
              alt=""
              className="h-16 w-24 shrink-0 rounded-lg object-cover opacity-90"
            />
            <div className="min-w-0">
              <p className="text-[10px] font-bold tracking-[0.14em] text-lime uppercase">
                Curso {course.n}
              </p>
              <p className="mt-1 text-[14px] leading-tight font-bold text-pretty">{course.short}</p>
              <p className="mt-1.5 text-[12px] leading-snug text-foreground/65">
                {course.shortDesc}
              </p>
              <p className="mt-1.5 text-[12.5px] font-bold text-foreground/45 line-through">
                {formatUSD(course.priceCents)}
              </p>
            </div>
          </li>
        ))}
      </ul>

      <div className="card-ink mt-6 rounded-2xl p-6 sm:p-8">
        <div className="text-center">
          <p className="text-[13px] text-foreground/70">
            Por separado costarían{" "}
            <span className="line-through">{formatUSD(upgrade.missingValueCents)}</span>. Hoy los
            sumas por:
          </p>
          <p className="display mt-3 text-[clamp(2.6rem,8vw,4rem)] text-lime">
            {formatUSD(upgrade.upgradeCostCents)}
          </p>
          <p className="mt-2 text-[13px] text-foreground/60">
            Completa el bundle de {formatUSD(BUNDLE_PRICE_CENTS)} — ahorras{" "}
            {formatUSD(upgrade.savingsCents)}
          </p>
        </div>

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
          {status === "processing" ? "Procesando…" : "Sí, añádelo a mi compra"}
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
          No, gracias. Sigo solo con mi curso.
        </button>
      </div>
    </PipelineShell>
  );
}

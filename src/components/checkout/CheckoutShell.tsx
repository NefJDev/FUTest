/**
 * Marco de las páginas del pipeline post-compra (upsell, downsell, gracias).
 *
 * A diferencia del checkout —que es una plantilla cerrada de Kajabi— estas SÍ
 * se construyen con el page builder, así que pueden llevar el diseño de marca.
 */

import type { ReactNode } from "react";

import headerLogo from "@/assets/header_logo.png.asset.json";

export function DemoNote() {
  return (
    <p className="text-center text-[11px] text-white/35">
      Demostración — no se procesa ningún pago real
    </p>
  );
}

export function PipelineShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen bg-navy-deep">
      <div
        className="grid-lines-dark pointer-events-none fixed inset-0 opacity-70"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none fixed inset-x-0 top-0 h-[420px] bg-[radial-gradient(60%_100%_at_50%_0%,color-mix(in_oklab,var(--indigo)_26%,transparent)_0%,transparent_70%)]"
        aria-hidden="true"
      />

      <header className="relative">
        <div className="mx-auto flex max-w-[860px] items-center justify-center px-5 py-6">
          <img
            src={headerLogo.url}
            alt="Francisco en las Redes University"
            className="h-8 w-auto max-w-none object-contain"
          />
        </div>
      </header>

      <main className="relative mx-auto max-w-[860px] px-5 pb-10">{children}</main>

      <div className="relative pb-10">
        <DemoNote />
      </div>
    </div>
  );
}

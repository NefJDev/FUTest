/**
 * Marcos de las páginas del pipeline de venta.
 *
 * Son dos porque en Kajabi son dos cosas distintas:
 *
 * - `CheckoutShell`  → la página de pago. Kajabi NO la construye con el page
 *   builder: es una plantilla cerrada donde solo se pueden cambiar el logo, los
 *   colores y los textos del botón. Por eso acá va deliberadamente sobria, con
 *   fondo claro y cajas simples: es lo que el cliente va a tener de verdad.
 *
 * - `PipelineShell`  → las páginas de upsell / downsell / gracias. Esas sí son
 *   páginas normales del page builder, así que pueden llevar el diseño de marca.
 *
 * Los colores del checkout van explícitos y no por tokens: el resto del sitio
 * es oscuro y estas páginas tienen que quedar claras sí o sí.
 */

import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import headerLogo from "@/assets/header_logo.png.asset.json";

/** Aviso de demo. En Kajabi este espacio lo ocupa "Powered by Kajabi". */
export function DemoNote({ dark = false }: { dark?: boolean }) {
  return (
    <p className={`text-center text-[11px] ${dark ? "text-white/35" : "text-[#9aa0ab]"}`}>
      Demostración — no se procesa ningún pago real
    </p>
  );
}

const LockIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    className="h-3.5 w-3.5"
  >
    <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
    <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
  </svg>
);

/* ------------------------------------------------- checkout (plantilla fija) */

export function CheckoutShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f4f5f7] text-[#1a1d26]">
      <header className="border-b border-[#e3e5e9] bg-white">
        <div className="mx-auto flex max-w-[1040px] items-center justify-between gap-4 px-5 py-4">
          <Link to="/" className="flex min-w-0 items-center">
            {/* El logo del sitio es claro, así que sobre blanco se invierte. */}
            <img
              src={headerLogo.url}
              alt="Francisco en las Redes University"
              className="h-7 w-auto max-w-none shrink-0 object-contain brightness-0"
            />
          </Link>
          <span className="flex shrink-0 items-center gap-1.5 text-[11px] font-medium text-[#6b7280]">
            <LockIcon />
            Pago seguro
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-[1040px] px-5 py-8 md:py-12">{children}</main>

      <div className="pb-10">
        <DemoNote />
      </div>
    </div>
  );
}

/* ------------------------------------ upsell / downsell / gracias (builder) */

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
        <DemoNote dark />
      </div>
    </div>
  );
}

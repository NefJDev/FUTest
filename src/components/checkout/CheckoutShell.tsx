/**
 * Marco visual de las páginas de pago y confirmación.
 *
 * A propósito es más sobrio que la landing: en un checkout todo lo que no
 * empuja a completar la compra distrae. Solo logo, candado y sello de demo.
 */

import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import headerLogo from "@/assets/header_logo.png.asset.json";

export function DemoBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border border-lime/50 bg-lime/10 px-3 py-1.5 text-[10px] font-bold tracking-[0.14em] text-lime uppercase ${className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-lime" aria-hidden="true" />
      Demo — no se cobra nada
    </span>
  );
}

export function CheckoutShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen bg-navy-deep">
      <div
        className="grid-lines-dark pointer-events-none fixed inset-0 opacity-70"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none fixed inset-x-0 top-0 h-[420px] bg-[radial-gradient(60%_100%_at_50%_0%,color-mix(in_oklab,var(--indigo)_28%,transparent)_0%,transparent_70%)]"
        aria-hidden="true"
      />

      <header className="relative border-b border-white/10">
        <div className="mx-auto grid max-w-[1100px] grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 py-4 md:px-8">
          <Link to="/" className="flex min-w-0 items-center">
            <img
              src={headerLogo.url}
              alt="Francisco en las Redes University"
              className="h-8 w-auto max-w-none shrink-0 object-contain"
            />
          </Link>
          <div className="flex shrink-0 items-center gap-3">
            <span className="hidden items-center gap-1.5 text-[11px] font-semibold tracking-wide text-foreground/60 sm:flex">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="h-4 w-4"
              >
                <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
                <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
              </svg>
              Pago seguro
            </span>
            <DemoBadge />
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-[1100px] px-5 py-10 md:px-8 md:py-14">
        {children}
      </main>
    </div>
  );
}

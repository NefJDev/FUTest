import { useState } from "react";
import footerLogo from "@/assets/footer_logo.png.asset.json";
import headerSeal from "@/assets/header_seal.png.asset.json";
import headerLogo from "@/assets/header_logo.png.asset.json";
import francisco from "@/assets/francisco.jpg.asset.json";
import { CheckoutProvider, useCheckout } from "@/components/checkout/CheckoutModal";
import {
  BUNDLE_ID,
  BUNDLE_PRICE_CENTS,
  CATALOG_VALUE_CENTS,
  COURSES,
  formatUSD,
  type CourseId,
  type ProductId,
} from "@/lib/catalog";
import { bundleCourses, courseThumbs, faqs, individualCards, pillars, reviews } from "./data";
import {
  Reveal,
  Tilt,
  scrollToSection,
  useAutoReveal,
  useInView,
  useParallax,
  useScrollProgress,
} from "./motion";

const Arrow = () => <span aria-hidden="true">→</span>;

/** Precio del curso individual más barato, para el "desde" del plan individual. */
const CHEAPEST_COURSE_CENTS = Math.min(...COURSES.map((c) => c.priceCents));

/** Ancla de la grilla de cursos sueltos. */
const INDIVIDUAL_SECTION_ID = "cursos-individuales";

/**
 * Enlace interno a una sección de la página.
 *
 * Tiene que ser un <button> y no un <a href="#seccion">: el router de TanStack
 * intercepta los clics en anclas y los trata como navegación, así que cancela
 * el salto nativo y la página nunca se mueve.
 */
function ScrollLink({
  to,
  className,
  children,
  label,
}: {
  to: string;
  className: string;
  children: React.ReactNode;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => scrollToSection(to)}
      className={className}
      {...(label ? { "aria-label": label } : {})}
    >
      {children}
    </button>
  );
}

/**
 * Botón de compra. Abre el popup checkout de la Offer, que es como funciona la
 * referencia del cliente en Kajabi (`#popup_checkout_...`): no hay carrito ni se
 * acumulan productos, se compra uno por transacción.
 */
function BuyButton({
  offer,
  className,
  children,
}: {
  offer: ProductId;
  className: string;
  children: React.ReactNode;
}) {
  const { open } = useCheckout();
  return (
    <button type="button" onClick={() => open(offer)} className={className}>
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ header */

function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[color-mix(in_oklab,var(--ink)_88%,transparent)] backdrop-blur-xl">
      <div className="mx-auto grid max-w-[1320px] grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 py-3.5 md:px-10">
        <ScrollLink
          to="top"
          className="flex min-w-0 items-center overflow-visible"
          label="Ir al inicio"
        >
          <img
            src={headerLogo.url}
            alt="Francisco en las Redes University"
            className="h-8 w-auto max-w-none shrink-0 object-contain md:h-10"
          />
        </ScrollLink>
        <nav className="flex shrink-0 items-center gap-3 md:gap-6">
          <ScrollLink to="programa" className="hidden text-xs font-bold tracking-[0.14em] text-foreground/85 uppercase transition-colors hover:text-lime sm:block">
            Programa
          </ScrollLink>
          <ScrollLink to="acceso" className="hidden text-xs font-bold tracking-[0.14em] text-foreground/85 uppercase transition-colors hover:text-lime sm:block">
            Acceso
          </ScrollLink>
          <ScrollLink to="bundle" className="btn-indigo">
            Inscribirme
          </ScrollLink>
        </nav>
      </div>
    </header>
  );
}

/* -------------------------------------------------------------------- hero */

const heroTags = ["Finanzas", "Inversiones", "Real Estate", "Ventas", "Mentalidad"];

const heroBullets = ["Lorem ipsum dolor sit amet.", "Lorem ipsum dolor sit amet.", "Lorem ipsum dolor sit amet."];

function Check() {
  return (
    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border border-white/70 text-[10px] leading-none text-foreground">
      ✓
    </span>
  );
}

function Hero() {
  const sealRef = useParallax<HTMLImageElement>(0.05);
  return (
    <section id="top" className="relative overflow-hidden">
      <div className="relative mx-auto max-w-[1320px] px-5 pt-14 pb-16 md:px-10 md:pt-20 md:pb-24">
        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-16">
          <Reveal className="min-w-0 text-center lg:text-left">
            <ul className="inline-flex max-w-full flex-nowrap items-center gap-x-1.5 whitespace-nowrap rounded-full border border-lime/70 px-3 py-1.5 sm:gap-x-3 sm:px-5 sm:py-2">
              {heroTags.map((t, i) => (
                <li key={t} className="flex items-center gap-1.5 sm:gap-3">
                  <span className="text-[9px] font-bold text-lime sm:text-[13px]">{t}</span>
                  {i < heroTags.length - 1 && <span className="text-[9px] text-lime sm:text-[13px]">•</span>}
                </li>
              ))}
            </ul>

            <h1 className="display mt-7 text-[clamp(2rem,6.2vw,4.2rem)] uppercase">
              <span className="block">Aprende a ganar dinero</span>
              <span className="block">como yo lo hice.</span>
              <span className="highlight-kinetic mt-1 inline [box-decoration-break:clone] [-webkit-box-decoration-break:clone] bg-lime px-2 text-ink lg:inline-block">
                El curso completo.
              </span>
            </h1>

            <p className="mx-auto mt-7 max-w-2xl text-base leading-relaxed text-balance text-foreground/85 lg:mx-0 md:text-lg">
              5 cursos en video para construir ingresos reales, marca personal y libertad financiera. El mismo modelo
              que me llevó a 1M de seguidores.
            </p>
          </Reveal>


          <div className="lg:w-[22rem]">
            <img
              ref={sealRef}
              src={headerSeal.url}
              alt="Sello Francisco en las Redes University"
              /* aspect-square reserva el alto antes de que cargue: sin esto el
                 contenido se corre al cargar y los anclajes caen en el lugar
                 equivocado. La imagen es cuadrada (1690x1690). */
              className="seal-parallax mx-auto block aspect-square w-44 max-w-none overflow-visible object-contain p-1 opacity-90 sm:w-56 lg:mt-2 lg:w-72"
            />
          </div>
        </div>

        {/* pricing row — cards 1+2 tight, larger gap before card 3 (aligned under the seal) */}
        <div className="mt-14 grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-16 md:mt-20">
          <div className="grid gap-5 sm:grid-cols-2">
            <Reveal delay={60}>
              <Tilt className="h-full">
                <PlanCard
                  title="Plan individual"
                  sub="Elige 1 curso desde:"
                  price={`${formatUSD(CHEAPEST_COURSE_CENTS)} c/u`}
                  cta="Elegir curso"
                  tone="soft"
                  scrollTo="programa"
                />
              </Tilt>
            </Reveal>
            <Reveal delay={140} strong>
              <Tilt className="h-full">
                <PlanCard
                  title="Plan completo"
                  sub="Acceso total a los 5 cursos + Beneficios:"
                  price={formatUSD(BUNDLE_PRICE_CENTS)}
                  cta="Quiero el bundle completo"
                  tone="strong"
                  popular
                  offer={BUNDLE_ID}
                />
              </Tilt>
            </Reveal>
          </div>
          <Reveal delay={200} className="card-ink relative rounded-2xl p-7 md:p-8 lg:w-[22rem]">
            <p className="text-sm leading-snug font-bold tracking-wide uppercase">
              Aprende lo que necesitas,
              <br />
              en el orden correcto.
            </p>
            <ul className="mt-7 space-y-7">
              <Highlight icon={<IconUsers />} big={<>5 cursos</>} small="En una sola ruta" />
              <Highlight icon={<IconPlay />} big="Paso a paso" small="Sin información dispersa" />
              <Highlight icon={<IconChart />} big={<>+5 años</>} small="De experiencia real de Francisco" />
            </ul>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

const IconUsers = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-7 w-7">
    <circle cx="9" cy="8" r="3" />
    <circle cx="17" cy="9" r="2.2" />
    <path d="M3.5 18c0-2.8 2.5-4.5 5.5-4.5s5.5 1.7 5.5 4.5" />
    <path d="M16 14c2.6.2 4.5 1.7 4.5 4" />
  </svg>
);

const IconPlay = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-7 w-7">
    <circle cx="12" cy="12" r="9" />
    <path d="M10 8.5l6 3.5-6 3.5z" fill="currentColor" stroke="none" />
  </svg>
);

const IconChart = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className="h-7 w-7">
    <path d="M4 20V12M9.5 20V8M15 20v-6" />
    <path d="M4 8l6-4 5 3 5-4" />
    <path d="M17 3h3v3" />
  </svg>
);

function Highlight({ icon, big, small }: { icon: React.ReactNode; big: React.ReactNode; small: string }) {
  return (
    <li className="flex items-center gap-4">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-foreground">{icon}</span>
      <span className="min-w-0">
        <span className="display block text-2xl uppercase md:text-3xl">{big}</span>
        <span className="mt-1 block text-[11px] font-semibold tracking-[0.12em] text-foreground/70 uppercase">{small}</span>
      </span>
    </li>
  );
}

function PlanCard({
  title,
  sub,
  price,
  cta,
  tone,
  popular,
  scrollTo,
  offer,
}: {
  title: string;
  sub: string;
  price: string;
  cta: string;
  tone: "soft" | "strong";
  popular?: boolean;
  /** Sección de destino, cuando la tarjeta no lleva directo a un checkout. */
  scrollTo?: string;
  offer?: ProductId;
}) {
  return (
    <div className="relative">
      {popular && (
        <span className="card-soft absolute -top-4 right-5 z-10 rounded-full px-5 py-2 text-[11px] font-bold tracking-[0.18em] uppercase">
          Mas popular
        </span>
      )}
      <div className={`card-indigo h-full rounded-2xl p-7 md:p-8 ${tone === "soft" ? "opacity-95 saturate-[0.9]" : ""}`}>
        <p className="text-sm font-bold tracking-[0.08em] uppercase">{title}</p>
        <p className="mt-2 text-sm text-foreground/85">{sub}</p>
        <p className="display mt-6 text-[clamp(2.2rem,4.4vw,3.1rem)]">{price}</p>
        <ul className="mt-7 space-y-4">
          {heroBullets.map((b, i) => (
            <li key={i} className="flex items-start gap-3 text-sm font-semibold">
              <Check />
              {b}
            </li>
          ))}
        </ul>
        {offer ? (
          <BuyButton offer={offer} className="btn-lime btn-sweep mt-8 w-full">
            {cta} <Arrow />
          </BuyButton>
        ) : (
          <ScrollLink to={scrollTo ?? "bundle"} className="btn-lime btn-sweep mt-8 w-full">
            {cta} <Arrow />
          </ScrollLink>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- courses reel */

function Courses() {
  return (
    <section id="acceso" className="relative scroll-mt-24 overflow-hidden">
      <div className="relative mx-auto max-w-[1320px] px-5 py-16 md:px-10 md:py-24">
        <Reveal>
          <h2 className="display mx-auto max-w-4xl text-center text-[clamp(1.7rem,4.4vw,3rem)]">
            Bundle de 5 cursos disponibles
          </h2>
        </Reveal>

        <Reveal delay={80} className="card-ink mx-auto mt-10 aspect-video w-full max-w-3xl rounded-2xl">
          <div className="grid h-full place-items-center">
            <button
              type="button"
              aria-label="Reproducir video de presentación"
              className="grid h-16 w-16 place-items-center rounded-full bg-indigo-soft text-xl text-foreground transition-transform hover:scale-105"
            >
              ▶
            </button>
          </div>
        </Reveal>

        <ul className="mt-8 grid grid-cols-2 gap-2.5 sm:mt-12 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5">
          {bundleCourses.map((c, i) => (
            <Reveal as="li" key={c.n} delay={i * 70} className={`card-ink relative overflow-hidden rounded-xl ${i === 4 ? "col-span-2 sm:col-span-1" : ""}`}>
              <img src={courseThumbs[i]} alt={c.title} loading="lazy" className="h-32 w-full object-cover opacity-70 sm:h-28" />
              <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,color-mix(in_oklab,var(--ink)_55%,transparent),color-mix(in_oklab,var(--ink)_92%,transparent))]" />
              <div className="absolute inset-0 flex items-center gap-2 p-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-indigo-soft text-[10px] text-foreground">▶</span>
                <span className="min-w-0">
                  <span className="block text-[9px] font-bold tracking-[0.18em] text-foreground/75 uppercase">Curso {c.n}</span>
                  <span className="mt-0.5 block text-[13px] leading-tight font-bold text-pretty">{c.title}</span>
                </span>
              </div>
            </Reveal>
          ))}
        </ul>

        <Reveal className="cta-pulse mt-8 flex flex-wrap justify-center gap-4 sm:mt-12">
          <BuyButton offer={BUNDLE_ID} className="btn-ink">
            Quiero acceso completo <Arrow />
          </BuyButton>
          <ScrollLink to="programa" className="btn-lime btn-sweep">
            Ver el programa
          </ScrollLink>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------- about */

function About() {
  const sealRef = useParallax<HTMLImageElement>(0.045);
  return (
    <section className="relative">
      <div className="relative mx-auto grid max-w-[1320px] items-center gap-10 px-5 py-16 md:grid-cols-2 md:px-10 md:py-24">
        <img
          ref={sealRef}
          src={headerSeal.url}
          alt="Emblema Francisco en las Redes University"
          loading="lazy"
          className="seal-parallax seal-hover mx-auto block aspect-square w-56 max-w-none overflow-visible rounded-full bg-ink object-contain p-1 sm:w-72 md:w-[26rem]"
        />
        <Reveal>
          <p className="eyebrow text-foreground/85">Qué es Francisco University</p>
          <h2 className="display mt-5 max-w-lg text-[clamp(1.7rem,4vw,2.8rem)]">
            Es una plataforma de crecimiento económico.
          </h2>
          <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-pretty text-foreground/90 md:text-base">
            Una universidad digital que enseña, desde la experiencia real, las herramientas que las personas necesitan
            para entender mejor el dinero, mejorar sus ingresos y construir nuevas oportunidades.
          </p>
          <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-pretty text-foreground/90 md:text-base">
            Francisco en las Redes University toma el conocimiento, la personalidad y la experiencia de Francisco y los
            convierte en un sistema educativo organizado, profesional y hecho para llevarte paso a paso.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------- program */

function Program() {
  /* scroll-mt deja aire para el header sticky: es destino del botón "Elegir
     curso" del hero y del enlace "Programa" del header. */
  return (
    <section id="programa" className="relative scroll-mt-24 pb-16 md:pb-24">
      <div className="relative mx-auto max-w-[1320px] px-5 md:px-10">
        <Reveal className="panel-glow rounded-3xl p-6 sm:p-10 md:p-14">
          <p className="eyebrow text-foreground/80">Programa académico</p>
          <h2 className="display mt-5 max-w-xl text-[clamp(1.7rem,4vw,2.8rem)]">Los 4 pilares del sistema completo</h2>

          <ul className="mt-10 border-t border-white/25">
            {pillars.map((p, i) => (
              <Reveal
                as="li"
                key={p.n}
                delay={i * 90}
                className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-5 gap-y-4 border-b border-white/25 py-7 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center"
              >
                <span className="display text-3xl text-foreground/90 md:text-4xl">{p.n}</span>
                <div className="min-w-0">
                  <p className="eyebrow text-foreground/75">{p.eyebrow}</p>
                  <h3 className="mt-2 text-lg font-bold text-pretty md:text-2xl">{p.title}</h3>
                  <p className="mt-1.5 max-w-2xl text-sm text-pretty text-foreground/85 md:text-base">{p.desc}</p>
                </div>
                <BuyButton
                  offer={p.id}
                  className="btn-lime btn-sweep col-span-2 justify-self-start md:col-span-1 md:justify-self-end"
                >
                  Comprar <Arrow />
                </BuyButton>
              </Reveal>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------- lime bands */

function LimeBand({ children, top, bottom }: { children: React.ReactNode; top: string; bottom: string }) {
  const darkBelow = bottom !== "transparent";
  void top;
  /* overflow-clip por el mismo motivo que <main>: el bloque de 320px que
     prolonga el fondo desborda 311px y haría de esta banda otra trampa. */
  return (
    <div className="relative z-10 overflow-clip bg-transparent py-[38px] md:py-[42px]">
      <div className="slant-band band-kinetic relative w-[126%] -ml-[13%]" data-no-reveal>
        <div
          className={`pointer-events-none absolute inset-x-0 h-[320px] bg-ink ${darkBelow ? "top-full" : "bottom-full"}`}
          aria-hidden="true"
        >
          <div className="grid-lines-dark absolute inset-0" />
        </div>
        <div className="relative bg-lime py-5 md:py-7">
          <p className="display px-4 text-center text-[clamp(1rem,3.1vw,2.1rem)] text-ink uppercase">{children}</p>
        </div>
      </div>
    </div>
  );
}


/* ------------------------------------------------------------------ bundle */

function BundleOffer({ id }: { id?: string }) {
  const { ref, inView } = useInView<HTMLDivElement>("0px 0px -18% 0px");
  return (
    <div
      ref={ref}
      data-visible={inView ? "true" : "false"}
      className="reveal reveal-strong bundle-glow cta-pulse glow-red scroll-mt-24 overflow-hidden rounded-2xl md:grid md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]"
      id={id}
    >
      <div className="card-ink rounded-none p-6 sm:p-9">
        <span className="card-red inline-block rounded-full px-5 py-2 text-[11px] font-bold tracking-[0.16em] text-foreground uppercase">
          Bundle completo • Ahorro 60%
        </span>
        <h3 className="display mt-7 max-w-xl text-[clamp(1.3rem,2.6vw,1.95rem)]">
          Todo lo que necesitas para tomar el control de tu dinero en un solo lugar.
        </h3>
        <ul className="mt-7">
          {bundleCourses.map((c) => (
            <li
              key={c.n}
              className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 border-b border-white/25 py-3.5"
            >
              <span className="display text-lg md:text-xl">{c.n}</span>
              <span className="min-w-0 text-sm text-foreground/90 md:text-base">{c.short}</span>
              <span className="text-sm font-bold line-through md:text-base">{c.price}</span>
            </li>
          ))}
          <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 py-3.5">
            <span className="text-sm text-foreground/90 md:text-base">Valor total</span>
            <span className="text-sm font-bold line-through md:text-base">
              {formatUSD(CATALOG_VALUE_CENTS)}
            </span>
          </li>
        </ul>
      </div>

      <div className="card-red price-focus flex flex-col items-center justify-center rounded-none p-8 text-center sm:p-10">
        <p className="text-sm font-bold tracking-wide uppercase">
          <span className="line-through">
            {formatUSD(CATALOG_VALUE_CENTS)}
          </span>{" "}
          Valor total
        </p>
        <p className="display mt-4 text-[clamp(3.4rem,9vw,6rem)]">
          {formatUSD(BUNDLE_PRICE_CENTS)}
        </p>
        <BuyButton offer={BUNDLE_ID} className="btn-lime btn-sweep cta-breathe mt-7 w-full max-w-md">
          Quiero el bundle completo <Arrow />
        </BuyButton>
        <p className="mt-6 text-sm text-foreground/90">Pago único · Acceso inmediato a los 5 cursos</p>
      </div>
    </div>
  );
}

function Comparison() {
  return (
    <section id="precios" className="relative scroll-mt-24 overflow-hidden bg-ink">
      <div className="grid-lines-dark absolute inset-0" aria-hidden="true" />
      <div className="relative mx-auto max-w-[1320px] px-5 py-16 md:px-10 md:py-24">
        <Reveal>
          <p className="eyebrow text-center text-foreground/70">Por separado vs. bundle</p>
          <h2 className="display mx-auto mt-6 max-w-3xl text-center text-[clamp(1.5rem,3.6vw,2.5rem)]">
            Son 5 cursos. Te conviene llevártelos completos.
          </h2>
        </Reveal>

        <div className="mt-12">
          <BundleOffer id="bundle" />
        </div>

        {/* individual cards — grilla de cursos sueltos.
            scroll-mt deja aire para el header sticky y para los precios,
            que sobresalen por encima de cada tarjeta. */}
        <div id={INDIVIDUAL_SECTION_ID} className="mt-20 scroll-mt-32 text-center">
          <p className="eyebrow text-foreground/70">O llévate un curso suelto</p>
          <h3 className="display mx-auto mt-4 max-w-2xl text-[clamp(1.3rem,3vw,2rem)]">
            Elige el que necesitas ahora
          </h3>
        </div>
        <ul className="mt-14 grid gap-x-4 gap-y-14 sm:grid-cols-2 lg:grid-cols-5">
          {individualCards.map((c, i) => (
            <IndividualCard key={c.id} card={c} delay={i * 70} />
          ))}
        </ul>
      </div>
    </section>
  );
}

function IndividualCard({
  card,
  delay,
}: {
  card: { id: CourseId; price: string; title: string; desc: string };
  delay: number;
}) {
  return (
    <Reveal as="li" delay={delay} className="card-ink relative rounded-xl border border-alert pt-10 pb-6">
      <span className="card-red absolute -top-8 left-4 grid h-16 w-16 place-items-center rounded-full text-base font-bold text-foreground">
        {card.price}
      </span>
      <div className="flex h-full flex-col px-5">
        <h3 className="text-base leading-tight font-bold whitespace-pre-line">{card.title}</h3>
        <p className="mt-4 mb-6 text-sm leading-relaxed text-pretty text-foreground/85">
          {card.desc}
        </p>

        {/* Sin botón de compra: los cursos sueltos solo se venden desde el
            programa académico. Aquí las tarjetas son informativas. */}
        <span className="card-red mt-auto inline-block rounded-md px-4 py-3 text-sm leading-tight font-bold text-foreground uppercase">
          Incluido
          <br />
          en el bundle
        </span>
      </div>
    </Reveal>
  );
}

/* ------------------------------------------------------------------- Bio */

function Bio() {
  return (
    <section id="por-que-francisco" className="relative scroll-mt-24">
      <div className="relative mx-auto max-w-[1320px] px-5 py-16 md:px-10 md:py-24">
        <Reveal className="panel-alt grid items-center gap-8 rounded-3xl p-6 sm:p-10 md:grid-cols-2 md:p-14">
          <img
            src={francisco.url}
            alt="Francisco grabando un podcast"
            loading="lazy"
            className="inner-depth w-full rounded-2xl object-cover"
          />
          <div>
            <p className="eyebrow text-foreground/80">Por qué Francisco</p>
            <h2 className="display mt-5 max-w-md text-[clamp(1.6rem,3.6vw,2.6rem)]">Es alguien que ya hizo el camino.</h2>
            <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-pretty text-foreground/90">
              No te voy a enseñar desde la teoría ni desde algo que leí en internet. Empecé desde cero, trabajé durante
              cinco años junto a Grant Cardone y aprendí sobre ventas, finanzas y real estate directamente en el
              terreno.
            </p>
            <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-pretty text-foreground/90">
              Puedes confiar en mí porque no voy a ocultarte los errores ni venderte promesas vacías. Cada curso nace de
              decisiones que yo mismo tomé, de lo que me funcionó, de lo que perdí y de todo lo que tuve que aprender
              para volver a construir.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- reviews */

function Reviews() {
  return (
    <section id="resenas" className="relative scroll-mt-24">
      <div className="relative mx-auto max-w-[1320px] px-5 py-16 md:px-10 md:py-24">
        <Reveal>
          <p className="eyebrow text-center text-foreground/80">Reseñas</p>
          <h2 className="display mx-auto mt-6 max-w-2xl text-center text-[clamp(1.7rem,4vw,2.8rem)]">
            Lo que pasa cuando aprenden conmigo
          </h2>
          <p className="mx-auto mt-7 max-w-3xl text-center text-[15px] leading-relaxed text-pretty text-foreground/90">
            Lo que vas a leer aquí son experiencias reales de personas de mi comunidad que han aplicado lo que comparto en
            Instagram y Discord para tomar mejores decisiones, invertir con más claridad y generar resultados.
          </p>
        </Reveal>

        {/* compact asymmetric masonry — balanced columns, no holes */}
        <div className="mx-auto mt-12 flex max-w-[980px] flex-col gap-3 lg:flex-row lg:items-start">
          {[
            [0, 1],
            [2, 3, 4],
            [5, 6, 7],
          ].map((col, c) => (
            <div key={c} className="flex flex-1 flex-col gap-3">
              {col.map((i, k) => {
                const r = reviews[i];
                if (!r) return null;
                return (
                  <Reveal key={i} delay={c * 90 + k * 70} className="card-ink rounded-xl p-5">
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                      <p className="truncate text-[13px] font-bold tracking-wide">USER NAME</p>
                      <p className="shrink-0 text-[9px] tracking-[0.18em] text-lime">★★★★★</p>
                    </div>
                    {r.paras.map((t, j) => (
                      <p key={j} className="mt-3 text-[12.5px] leading-[1.55] text-foreground/85">
                        {t}
                      </p>
                    ))}
                    <p className="mt-4 text-[12.5px] font-bold">1 ago 2026</p>
                  </Reveal>
                );
              })}
            </div>
          ))}
        </div>


      </div>
    </section>
  );
}

/* -------------------------------------------------------------------- FAQ */

function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="relative scroll-mt-24">
      <div className="relative mx-auto max-w-[1320px] px-5 py-16 md:px-10 md:py-24">
        <p className="eyebrow text-foreground/80">Preguntas frecuentes</p>
        <h2 className="display mt-6 max-w-2xl text-[clamp(1.6rem,3.6vw,2.4rem)]">
          Antes de que entres, resolvamos tus dudas.
        </h2>

        <ul className="mt-10 border-t border-white/30">
          {faqs.map((f, i) => (
            <li key={f.q} className="border-b border-white/30">
              <button
                type="button"
                aria-expanded={open === i}
                onClick={() => setOpen(open === i ? null : i)}
                className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-4 py-6 text-left"
              >
                <span className="text-base font-bold text-pretty md:text-lg">{f.q}</span>
                <span className={`shrink-0 text-lime transition-transform ${open === i ? "rotate-45" : ""}`}>+</span>
              </button>
              {open === i && (
                <p className="-mt-2 max-w-4xl pb-6 text-[15px] leading-relaxed text-pretty text-foreground/90">{f.a}</p>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------- footer */

/**
 * Enlace del pie: o salta a una sección de esta misma página (`to`), o sale a
 * un sitio externo (`href`).
 */
type FooterLink = { label: string; to: string } | { label: string; href: string };

const footerLinkClass = "text-sm text-foreground/80 transition-colors hover:text-lime";

function Footer() {
  const cols: { title: string; items: FooterLink[] }[] = [
    {
      title: "Programa",
      items: [
        { label: "Los 5 cursos", to: "acceso" },
        { label: "Por qué Francisco", to: "por-que-francisco" },
        { label: "El bundle", to: "bundle" },
      ],
    },
    {
      title: "Acceso",
      items: [
        { label: "Precios", to: "precios" },
        { label: "Reseñas", to: "resenas" },
        { label: "Preguntas frecuentes", to: "faq" },
      ],
    },
    {
      title: "Comunidad",
      items: [
        { label: "franciscoenlasredes.com", href: "https://franciscoenlasredes.com/" },
        { label: "@franciscoenlasredes", href: "https://www.instagram.com/franciscoenlasredes/" },
      ],
    },
  ];
  return (
    <footer className="relative bg-ink">
      <div className="relative mx-auto max-w-[1320px] px-5 py-16 md:px-10 md:py-20">
        <div className="grid gap-10 md:grid-cols-[minmax(0,1.3fr)_repeat(3,minmax(0,1fr))]">
          <div>
            <img src={footerLogo.url} alt="Francisco en las Redes University" className="h-11 w-auto" />
            <p className="mt-6 max-w-xs text-sm leading-relaxed text-pretty text-foreground/80">
              5 cursos en video para construir ingresos reales, marca personal y libertad financiera.
            </p>
          </div>
          {cols.map((c) => (
            <div key={c.title}>
              <p className="text-sm font-bold tracking-[0.08em] uppercase">{c.title}</p>
              <ul className="mt-5 space-y-4">
                {c.items.map((item) => (
                  <li key={item.label}>
                    {"href" in item ? (
                      <a
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={footerLinkClass}
                      >
                        {item.label}
                      </a>
                    ) : (
                      <ScrollLink to={item.to} className={footerLinkClass}>
                        {item.label}
                      </ScrollLink>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="mt-14 max-w-5xl border-t border-white/15 pt-8 text-sm leading-relaxed text-pretty text-foreground/70">
          La información compartida en Francisco en las Redes University tiene fines educativos y de desarrollo
          personal. No constituye asesoría financiera, legal o de inversión personalizada. Los resultados dependen del
          esfuerzo, el contexto y las decisiones de cada persona.
        </p>
      </div>
    </footer>
  );
}

/* -------------------------------------------------------------------- page */

export default function Landing() {
  return (
    <CheckoutProvider>
      <LandingContent />
    </CheckoutProvider>
  );
}

function LandingContent() {
  const gridRef = useParallax<HTMLDivElement>(0.02);
  const progressRef = useScrollProgress<HTMLElement>();
  const autoRef = useAutoReveal<HTMLDivElement>();
  return (
    <div ref={autoRef} className="min-h-screen bg-background">
      <Header />
      {/* overflow-clip y no overflow-hidden: `hidden` convierte a <main> en un
          contenedor scrolleable por código, así que scrollIntoView lo desplazaba
          por dentro en vez de mover la página. Como la rueda del ratón no puede
          devolverlo, el hero quedaba inalcanzable hasta recargar. `clip` recorta
          exactamente igual pero no admite scroll. */}
      <main ref={progressRef} className="relative overflow-clip">
        <div className="master-bg absolute inset-0" aria-hidden="true" />
        <div className="aurora-a absolute inset-0" aria-hidden="true" />
        <div className="aurora-b absolute inset-0" aria-hidden="true" />
        <div className="aurora-c absolute inset-0" aria-hidden="true" />
        <div className="light-flow absolute inset-0" aria-hidden="true" />
        <div ref={gridRef} className="grid-lines absolute inset-x-0 -inset-y-40 will-change-transform" aria-hidden="true" />
        <div className="relative">
        <Hero />
        <Courses />

        {/* continuous gradient block A */}
        <div className="relative">
          <div className="relative">
            <About />
            <Program />
          </div>
        </div>

        <LimeBand top="transparent" bottom="var(--ink)">
          Obtén el bundle completo por{" "}
          <span className="line-through">{formatUSD(CATALOG_VALUE_CENTS)}</span>{" "}
          {formatUSD(BUNDLE_PRICE_CENTS)}
        </LimeBand>

        <Comparison />

        <LimeBand top="var(--ink)" bottom="transparent">
          Si compras el bundle completo, ahorras 60%
        </LimeBand>

        {/* continuous gradient block B — Bio → Reviews → FAQ → final CTA */}
        <div className="relative">
          <div className="relative">
            <Bio />
            <Reviews />
            <Faq />
            <div className="mx-auto max-w-[1320px] px-5 pb-16 md:px-10 md:pb-24">
              <BundleOffer />
            </div>
          </div>
        </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

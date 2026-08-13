import { useEffect, useRef, useState, type ReactNode } from "react";

/* ------------------------------------------------------------------ helpers */

function prefersReduced() {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

/** Observes an element and reports visibility, re-entering both on scroll down and up. */
export function useInView<T extends HTMLElement>(rootMargin = "0px 0px -12% 0px") {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReduced() || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) setInView(e.isIntersecting);
      },
      { rootMargin, threshold: 0.08 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin]);

  return { ref, inView };
}

/* ------------------------------------------------------------------ reveal */

export function Reveal({
  children,
  className = "",
  delay = 0,
  strong = false,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  strong?: boolean;
  as?: "div" | "li" | "section" | "span";
}) {
  const { ref, inView } = useInView<HTMLDivElement>();
  const Comp = Tag as "div";
  return (
    <Comp
      ref={ref}
      className={`reveal ${strong ? "reveal-strong" : ""} ${className}`}
      data-visible={inView ? "true" : "false"}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </Comp>
  );
}

/* --------------------------------------------------------------------- tilt */

/** Subtle magnetic hover + depth tilt (max ~3deg). Disabled on touch / reduced motion. */
export function Tilt({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement | null>(null);

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el || prefersReduced()) return;
    if (window.matchMedia("(hover: none)").matches) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(1100px) rotateY(${px * 5}deg) rotateX(${-py * 5}deg) translate3d(${px * 6}px, ${py * 6 - 3}px, 0)`;
  };

  const reset = () => {
    const el = ref.current;
    if (el) el.style.transform = "";
  };

  return (
    <div ref={ref} onMouseMove={onMove} onMouseLeave={reset} className={`tilt ${className}`}>
      {children}
    </div>
  );
}

/* ----------------------------------------------------------------- parallax */

/** Very subtle vertical parallax driven by scroll position. */
export function useParallax<T extends HTMLElement>(strength = 0.06) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReduced()) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const offset = (r.top + r.height / 2 - window.innerHeight / 2) * -strength;
      el.style.transform = `translate3d(0, ${offset.toFixed(2)}px, 0)`;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [strength]);

  return ref;
}

/* -------------------------------------------------------- scroll progress */

/** Writes a 0→1 scroll progress var (--sp) used by the animated background. */
export function useScrollProgress<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      el.style.setProperty("--sp", p.toFixed(4));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return ref;
}

/* ------------------------------------------------------- auto reveal (page) */

/**
 * Gives every remaining text/media block a subtle fade + lift as it enters the
 * viewport, and fades it back out when it leaves. Purely presentational: no
 * layout, spacing or copy changes. Elements already inside a <Reveal> or
 * marked with data-no-reveal are skipped.
 */
export function useAutoReveal<T extends HTMLElement>(deps: unknown[] = []) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root || prefersReduced() || typeof IntersectionObserver === "undefined") return;

    const selector =
      "h1,h2,h3,h4,p,li,figure,blockquote,img," +
      "a.btn-lime,a.btn-ink,a.btn-indigo,button.btn-lime,button.btn-ink,button.btn-indigo";
    const targets: HTMLElement[] = [];

    root.querySelectorAll<HTMLElement>(selector).forEach((el) => {
      if (el.closest("[data-no-reveal]")) return;
      if (el.classList.contains("reveal")) return;
      if (el.closest(".reveal")) return;
      if (el.closest("header")) return;
      targets.push(el);
    });

    const groups = new Map<Element, number>();
    targets.forEach((el) => {
      const parent = el.parentElement ?? root;
      const i = groups.get(parent) ?? 0;
      groups.set(parent, i + 1);
      el.classList.add("reveal", "reveal-soft");
      el.style.transitionDelay = `${Math.min(i, 6) * 55}ms`;
      el.dataset["visible"] = "false";
    });

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          (e.target as HTMLElement).dataset["visible"] = e.isIntersecting ? "true" : "false";
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 },
    );
    targets.forEach((el) => io.observe(el));

    return () => {
      io.disconnect();
      targets.forEach((el) => {
        el.classList.remove("reveal", "reveal-soft");
        el.style.transitionDelay = "";
        delete el.dataset["visible"];
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return ref;
}

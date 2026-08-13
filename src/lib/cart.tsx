/**
 * Estado del carrito y del funnel de venta (upsell → downsell).
 *
 * Reproduce el comportamiento de Kajabi:
 *   1. El cliente agrega uno o más cursos sueltos.
 *   2. El carrito le ofrece el bundle completo acreditándole lo que ya lleva,
 *      así solo paga la diferencia hasta $497.
 *   3. Si rechaza esa oferta aparece el downsell: el mismo bundle, pero en
 *      3 cuotas sin recargo.
 *
 * Se persiste en localStorage para que el flujo sobreviva un refresh, que es
 * como se comporta un carrito real.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  BUNDLE_ID,
  BUNDLE_PRICE_CENTS,
  calcBundleUpgrade,
  getProduct,
  isCourseId,
  splitInstallments,
  type BundleUpgrade,
  type CourseId,
  type Product,
  type ProductId,
} from "./catalog";

const STORAGE_KEY = "felru-cart-v2";

export type PaymentPlan = "full" | "x3";

type PersistedCart = {
  items: ProductId[];
  paymentPlan: PaymentPlan;
  upsellDeclined: boolean;
  downsellDismissed: boolean;
  /* Qué aceptó realmente, para no inferirlo del plan de pago: alguien puede
     comprar el bundle directo desde la landing sin haber visto el funnel. */
  upsellAccepted: boolean;
  downsellAccepted: boolean;
};

const EMPTY: PersistedCart = {
  items: [],
  paymentPlan: "full",
  upsellDeclined: false,
  downsellDismissed: false,
  upsellAccepted: false,
  downsellAccepted: false,
};

function isProductId(value: unknown): value is ProductId {
  return typeof value === "string" && (value === BUNDLE_ID || isCourseId(value));
}

function readStorage(): PersistedCart {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<PersistedCart>;
    const items = Array.isArray(parsed.items) ? parsed.items.filter(isProductId) : [];
    return {
      // Dedupe: los cursos son productos digitales, no hay cantidades.
      items: [...new Set(items)],
      paymentPlan: parsed.paymentPlan === "x3" ? "x3" : "full",
      upsellDeclined: parsed.upsellDeclined === true,
      downsellDismissed: parsed.downsellDismissed === true,
      upsellAccepted: parsed.upsellAccepted === true,
      downsellAccepted: parsed.downsellAccepted === true,
    };
  } catch {
    return EMPTY;
  }
}

export type CartLine = Product & { isBundle: boolean };

export type CartValue = {
  /** true una vez leído localStorage; evita parpadeos en SSR. */
  hydrated: boolean;
  isOpen: boolean;
  open: () => void;
  close: () => void;

  lines: CartLine[];
  courseIds: CourseId[];
  hasBundle: boolean;
  itemCount: number;
  isEmpty: boolean;

  subtotalCents: number;
  totalCents: number;
  paymentPlan: PaymentPlan;
  installments: number[];
  /** Lo que se cobra hoy: el total, o la primera cuota si eligió 3 pagos. */
  dueTodayCents: number;

  upgrade: BundleUpgrade;
  showUpsell: boolean;
  showDownsell: boolean;
  /** Qué pasos del funnel se mostraron y cuáles aceptó. */
  funnel: {
    upsellShown: boolean;
    upsellAccepted: boolean;
    downsellShown: boolean;
    downsellAccepted: boolean;
  };

  addCourse: (id: CourseId) => void;
  addBundle: (plan?: PaymentPlan) => void;
  remove: (id: ProductId) => void;
  clear: () => void;
  setPaymentPlan: (plan: PaymentPlan) => void;

  acceptUpsell: () => void;
  declineUpsell: () => void;
  acceptDownsell: () => void;
  dismissDownsell: () => void;
};

const CartContext = createContext<CartValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PersistedCart>(EMPTY);
  const [hydrated, setHydrated] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Hidratar desde localStorage después del primer render: en SSR no existe.
  useEffect(() => {
    setState(readStorage());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* modo privado / almacenamiento lleno: el carrito sigue funcionando en memoria */
    }
  }, [state, hydrated]);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  const addCourse = useCallback((id: CourseId) => {
    setState((prev) => {
      // Si ya tiene el bundle, el curso suelto ya está incluido.
      if (prev.items.includes(BUNDLE_ID) || prev.items.includes(id)) return prev;
      return { ...prev, items: [...prev.items, id] };
    });
    setIsOpen(true);
  }, []);

  const addBundle = useCallback((plan: PaymentPlan = "full") => {
    // El bundle reemplaza cualquier curso suelto: ya los contiene a todos.
    setState((prev) => ({ ...prev, items: [BUNDLE_ID], paymentPlan: plan }));
    setIsOpen(true);
  }, []);

  const remove = useCallback((id: ProductId) => {
    setState((prev) => {
      const items = prev.items.filter((item) => item !== id);
      // Vaciar el carrito reinicia el funnel por completo.
      if (items.length === 0) return EMPTY;
      return {
        ...prev,
        items,
        paymentPlan: items.includes(BUNDLE_ID) ? prev.paymentPlan : "full",
      };
    });
  }, []);

  const clear = useCallback(() => setState(EMPTY), []);

  const setPaymentPlan = useCallback((plan: PaymentPlan) => {
    setState((prev) => ({ ...prev, paymentPlan: plan }));
  }, []);

  const acceptUpsell = useCallback(() => {
    setState((prev) => ({
      ...prev,
      items: [BUNDLE_ID],
      paymentPlan: "full",
      upsellAccepted: true,
    }));
  }, []);

  const declineUpsell = useCallback(() => {
    setState((prev) => ({ ...prev, upsellDeclined: true }));
  }, []);

  const acceptDownsell = useCallback(() => {
    setState((prev) => ({
      ...prev,
      items: [BUNDLE_ID],
      paymentPlan: "x3",
      downsellAccepted: true,
    }));
  }, []);

  const dismissDownsell = useCallback(() => {
    setState((prev) => ({ ...prev, downsellDismissed: true }));
  }, []);

  const value = useMemo<CartValue>(() => {
    const lines = state.items
      .map((id) => {
        const product = getProduct(id);
        return product ? { ...product, isBundle: product.id === BUNDLE_ID } : null;
      })
      .filter((line): line is CartLine => line !== null);

    const hasBundle = state.items.includes(BUNDLE_ID);
    const courseIds = state.items.filter((id): id is CourseId => id !== BUNDLE_ID);
    const subtotalCents = lines.reduce((sum, line) => sum + line.priceCents, 0);

    const paymentPlan: PaymentPlan = hasBundle ? state.paymentPlan : "full";
    const totalCents = subtotalCents;
    const installments =
      paymentPlan === "x3" ? splitInstallments(BUNDLE_PRICE_CENTS) : [totalCents];

    return {
      hydrated,
      isOpen,
      open,
      close,

      lines,
      courseIds,
      hasBundle,
      itemCount: lines.length,
      isEmpty: lines.length === 0,

      subtotalCents,
      totalCents,
      paymentPlan,
      installments,
      dueTodayCents: installments[0] ?? 0,

      upgrade: calcBundleUpgrade(courseIds),
      // El upsell aparece mientras tenga cursos sueltos y no lo haya rechazado.
      showUpsell: !hasBundle && courseIds.length > 0 && !state.upsellDeclined,
      // El downsell solo después de rechazar el upsell.
      showDownsell:
        !hasBundle && courseIds.length > 0 && state.upsellDeclined && !state.downsellDismissed,
      funnel: {
        upsellShown: state.upsellDeclined || state.upsellAccepted || courseIds.length > 0,
        upsellAccepted: state.upsellAccepted,
        downsellShown: state.upsellDeclined,
        downsellAccepted: state.downsellAccepted,
      },

      addCourse,
      addBundle,
      remove,
      clear,
      setPaymentPlan,

      acceptUpsell,
      declineUpsell,
      acceptDownsell,
      dismissDownsell,
    };
  }, [
    state,
    hydrated,
    isOpen,
    open,
    close,
    addCourse,
    addBundle,
    remove,
    clear,
    setPaymentPlan,
    acceptUpsell,
    declineUpsell,
    acceptDownsell,
    dismissDownsell,
  ]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart debe usarse dentro de <CartProvider>");
  return ctx;
}

/** Bloquea el scroll del body mientras un overlay está abierto. */
export function useScrollLock(active: boolean) {
  const previous = useRef<string>("");

  useEffect(() => {
    if (!active) return;
    previous.current = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous.current;
    };
  }, [active]);
}

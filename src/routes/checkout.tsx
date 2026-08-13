import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { CheckoutModal } from "@/components/checkout/CheckoutModal";
import { BUNDLE_ID, getProduct, type ProductId } from "@/lib/catalog";

/**
 * Enlace directo al checkout.
 *
 * En Kajabi cada Offer tiene además de su popup una URL de checkout propia; esta
 * ruta cumple ese papel. Renderiza el mismo popup sobre un fondo oscuro para que
 * se vea idéntico venga de donde venga.
 */
type CheckoutSearch = { offer: ProductId };

export const Route = createFileRoute("/checkout")({
  validateSearch: (search: Record<string, unknown>): CheckoutSearch => {
    const raw = typeof search["offer"] === "string" ? search["offer"] : BUNDLE_ID;
    return { offer: (getProduct(raw) ? raw : BUNDLE_ID) as ProductId };
  },
  head: () => ({
    meta: [
      { title: "Checkout — Francisco en las Redes University" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const { offer } = Route.useSearch();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-navy-deep">
      <CheckoutModal offer={offer} onClose={() => void navigate({ to: "/" })} />
    </div>
  );
}

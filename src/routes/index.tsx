import { createFileRoute } from "@tanstack/react-router";
import Landing from "@/components/landing/Landing";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Francisco University — Bundle de 5 cursos por $497" },
      {
        name: "description",
        content:
          "5 cursos en video para construir ingresos reales, marca personal y libertad financiera. Bundle completo con 60% de ahorro: $497 en vez de $1,335.",
      },
      { property: "og:title", content: "Francisco University — Bundle de 5 cursos por $497" },
      {
        property: "og:description",
        content:
          "Aprende a ganar dinero como yo lo hice. Finanzas, inversiones, real estate, ventas y mentalidad en una sola ruta.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return <Landing />;
}

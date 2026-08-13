import { COURSES, formatUSD } from "@/lib/catalog";

/* Todo lo que lleva precio o título de curso se deriva de src/lib/catalog.ts,
   que es la fuente única de verdad que también usan el carrito y el checkout. */

export const courseThumbs = COURSES.map((c) => c.thumb);

export const bundleCourses = COURSES.map((c) => ({
  id: c.id,
  n: c.n,
  title: c.title,
  short: c.short,
  price: formatUSD(c.priceCents),
}));

export const pillars = COURSES.map((c) => ({
  id: c.id,
  n: c.n,
  eyebrow: c.eyebrow,
  title: c.short,
  desc: c.desc,
}));

export const individualCards = COURSES.map((c) => ({
  id: c.id,
  price: formatUSD(c.priceCents),
  title: c.cardTitle,
  desc: c.shortDesc,
}));

export const faqs = [
  {
    q: "¿Necesito experiencia previa para empezar?",
    a: "No. El bundle está pensado para empezar desde cero y avanzar curso por curso, sin saltarte fundamentos.",
  },
  {
    q: "¿Puedo comprar un solo curso en vez del bundle?",
    a: "Sí. Cada curso está disponible por separado, aunque el bundle completo es la opción más completa y con mayor ahorro.",
  },
  {
    q: "¿Qué diferencia hay entre el bundle y la mentoría 1:1?",
    a: "El bundle te da acceso a los 5 cursos, comunidad y actualizaciones. La mentoría 1:1 suma una sesión directa con Francisco y un plan de negocio personalizado — el bundle completo ya viene incluido ahí.",
  },
  {
    q: "¿Esto es asesoría financiera personalizada?",
    a: "No. El contenido tiene un enfoque educativo. Enseña principios, herramientas y experiencia real, pero no sustituye una asesoría financiera, legal o de inversión personalizada.",
  },
  {
    q: "¿Cuánto tiempo tengo acceso a los cursos?",
    a: "Con el bundle completo, las actualizaciones son para siempre. Con un curso individual, tienes acceso completo a ese curso y sus actualizaciones.",
  },
  {
    q: "¿Qué pasa si tengo dudas durante el proceso?",
    a: "La comunidad y las sesiones mensuales premium están para resolver dudas — no estás solo con un video.",
  },
];

export const reviewBody =
  "Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip e.";

export const reviews: { paras: string[] }[] = [
  {
    paras: [
      "Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip e.",
      "Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat.",
      "Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet.",
    ],
  },
  {
    paras: [
      "Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip e.",
      "Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat.",
      "Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet.",
    ],
  },
  {
    paras: [
      "Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip e.",
    ],
  },
  {
    paras: [
      "Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip e.",
      "Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet.",
    ],
  },
  {
    paras: [
      "Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip e.",
    ],
  },
  {
    paras: [
      "Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip e.",
      "Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet.",
    ],
  },
  {
    paras: [
      "Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip e.",
    ],
  },
  {
    paras: [
      "Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip e.",
    ],
  },
];

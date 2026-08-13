# Pipeline de venta — réplica de Kajabi

Demo del flujo de compra para mostrarle al cliente cómo va a funcionar la
tienda antes de contratar la suscripción de Kajabi.

> **No se cobra nada.** No hay pasarela conectada. El número de tarjeta nunca
> sale del navegador: se valida el formato con Luhn y solo se envían los
> últimos 4 dígitos y la marca.

## Por qué está armado así

Todo lo que hay acá existe en Kajabi. Se evitó a propósito cualquier cosa que
después no se pueda construir dentro de la plataforma:

| Kajabi                              | Se puede diseñar        | Acá                        |
| ----------------------------------- | ----------------------- | -------------------------- |
| Carrito de compras                  | **No existe**           | No hay carrito             |
| Popup checkout                      | Plantilla fija          | `CheckoutModal.tsx`        |
| Order Bump                          | Bloque fijo del popup   | "AGREGAR A TU COMPRA"      |
| Payment Plan de una Offer           | Opciones de la Offer    | Radios "1 pago / 3 pagos"  |
| Upsell / Downsell post-compra       | **Page builder**        | `/oferta`, `/oferta-final` |
| Thank you page                      | **Page builder**        | `/gracias`                 |

### El checkout está calcado de una tienda Kajabi real

Se tomó como referencia `cursos.marlylactancia.com/chaoteta`, que corre en
Kajabi y usa **popup checkout** (`#popup_checkout_...`, renderizado con Sage,
el design system de Kajabi). De ahí salió la estructura, campo por campo:

```
┌─ [logo] Marca ────────────────────────────────────── X ─┐
│ Título del producto        │ Contacto                   │
│ [img]  USD  USD 197.00     │  Correo electrónico        │
│ ─────────────────────────  │  Nombre completo           │
│ AGREGAR A TU COMPRA        │ ────────────────────────── │
│ ┌───────────────────────┐  │ Método de pago             │
│ │[img] Título       (+) │  │  ○ Tarjeta                 │
│ │      Descripción      │  │  ○ PayPal                  │
│ │      USD 300.00       │  │  ☐ Guardar esta tarjeta    │
│ └───────────────────────┘  │ ────────────────────────── │
│ Resumen                    │ [ Pagar USD 197.00 USD ]   │
│ Ahora      USD  USD 197.00 │ Transacciones seguras...   │
└─────────────────────────────────────────────────────────┘
```

Lo único que cambia respecto a la referencia son el logo, los colores y la
tipografía — que es justamente lo que Kajabi deja configurar en el tema.

Dos consecuencias importantes:

1. **No se pueden comprar dos cursos sueltos en una sola transacción.** En
   Kajabi cada Offer tiene su propio checkout. Si alguien quiere dos cursos,
   son dos compras. Por eso los botones llevan directo a `/checkout?offer=<id>`.
2. **El checkout se ve más sobrio que el resto del sitio.** Es intencional: el
   popup no pasa por el page builder, solo se le puede cambiar logo, colores y
   textos. Las páginas de upsell, downsell y gracias sí llevan diseño de marca
   porque esas sí son páginas del builder.
3. **Los métodos de pago dependen de la cuenta.** Se muestran Tarjeta y PayPal,
   que son los que Kajabi soporta de fábrica. Klarna y Afterpay (que aparecen en
   la referencia) salen de Stripe y hay que activarlos aparte según el país.

## El funnel

```
Clic en un curso  →  CHECKOUT
                       │  Order Bump: "añade los otros 4 por +$100"
              ┌────────┴────────┐
          lo marca          no lo marca
              │                  │
          Bundle $497      →  UPSELL post-compra (1 clic, $100)
              │                  │
              │           ┌──────┴──────┐
              │        acepta        rechaza
              │           │             │
              │           │      →  DOWNSELL (mismo upgrade en 3 pagos)
              │           │             │
              └───────────┴─────────────┴──→  GRACIAS
```

### Venta cruzada — dos Order Bumps por checkout

El checkout nunca ofrece solo "compra y listo". Cada curso lleva **dos bumps**:

1. **El curso complementario**, emparejado por tema y a precio especial, con una
   línea explicando *por qué* se lo recomendamos.
2. **El bundle completo**, que siempre está disponible como tercera opción.

El mapa de afinidad vive en `PAIRINGS` dentro de `src/lib/catalog.ts`:

| Si compra…                        | Se le ofrece…                     | Precio bump | Lista |
| --------------------------------- | --------------------------------- | ----------: | ----: |
| 01 · Empresa de contenido         | 05 · Grabación y edición          |         $97 |  $197 |
| 02 · De 0 a 1 millón de seguidores| 01 · Empresa de contenido         |         $97 |  $197 |
| 03 · Real Estate                  | 02 · De 0 a 1 millón de seguidores|        $147 |  $297 |
| 04 · Inversiones                  | 03 · Real Estate                  |        $197 |  $397 |
| 05 · Grabación y edición          | 01 · Empresa de contenido         |         $97 |  $197 |

> **Esto no es un algoritmo.** En Kajabi cada emparejamiento se carga a mano como
> un Order Bump dentro de la Offer de ese curso — son 5 Offers × 2 bumps. Para el
> comprador el resultado es idéntico al de una recomendación automática, y es
> 100% reproducible en la plataforma.

**Una salvedad honesta:** Kajabi no sabe que los dos bumps son excluyentes. Acá,
al marcar el bundle se desmarca y bloquea el complementario ("Ya incluido en el
bundle"), porque de lo contrario el cliente pagaría dos veces por el mismo curso.
En Kajabi habría que resolverlo con el texto del bump o aceptando ese riesgo.

### Order Bump del bundle — crédito del curso elegido

Lo que ya está pagando por el curso se le acredita contra el precio del bundle,
así que solo abona la diferencia hasta $497:

| Curso en el checkout | Ya paga | Bump  | Los otros 4 valen | Descuento |
| -------------------- | ------: | ----: | ----------------: | --------: |
| Real Estate          |    $397 |  $100 |              $938 |      −89% |
| Redes                |    $297 |  $200 |            $1,038 |      −81% |
| Empresa de contenido |    $197 |  $300 |            $1,138 |      −74% |

Al marcarlo, el total pasa a $497 y se habilitan las opciones de plan de pago.

### Upsell y downsell post-compra

Se cobran **como una transacción aparte** a la tarjeta que ya quedó guardada,
que es exactamente como Kajabi maneja los one-click upsells. Por eso la página
de gracias muestra dos recibos.

El downsell reparte el mismo upgrade en 3 pagos sin recargo. Las cuotas suman
siempre el total exacto: el resto de la división se carga a los primeros pagos,
nunca queda un total de $100.02.

> **Nota:** como el upgrade ya viene con el crédito aplicado, para quien compró
> el curso de $397 el downsell queda en 3 pagos de $33.34. Si prefieres que el
> downsell se sienta más grande, la alternativa es no acreditar el curso y
> ofrecer el bundle completo en 3 cuotas de $165.67 — pero eso significa
> cobrarle dos veces el curso que ya compró.

## Probarlo

```bash
npm run dev
```

| Tarjeta               | Resultado      |
| --------------------- | -------------- |
| `4242 4242 4242 4242` | Pago aprobado  |
| `4000 0000 0000 0002` | Pago rechazado |

Cualquier vencimiento futuro y CVC sirven. La página de gracias incluye un
bloque **"Recorrido de esta compra"** que muestra qué pasos del pipeline se
dispararon — sirve para explicarle el mecanismo al cliente. Ese bloque es solo
de la demo.

## Cómo está armado

| Archivo                                    | Qué hace                                            |
| ------------------------------------------ | --------------------------------------------------- |
| `src/lib/catalog.ts`                       | **Fuente única de verdad**: precios, cuotas, upgrade |
| `src/lib/orders.ts`                        | Server functions: compra principal y oferta post-compra |
| `src/lib/card.ts`                          | Validación de tarjeta (Luhn, marca, vencimiento)     |
| `src/components/checkout/CheckoutModal.tsx`| **Popup checkout** + Order Bump + plan de pago       |
| `src/components/checkout/CheckoutShell.tsx`| Marco de las páginas del page builder                |
| `src/routes/checkout.tsx`                  | Enlace directo al popup (`?offer=<id>`)              |
| `src/routes/oferta.tsx`                    | Upsell post-compra                                   |
| `src/routes/oferta-final.tsx`              | Downsell post-compra                                 |
| `src/routes/gracias.tsx`                   | Confirmación con los recibos                         |

**Para cambiar cualquier precio, toca solo `src/lib/catalog.ts`.** La landing,
el checkout y el servidor leen todos de ahí.

El servidor **recalcula todos los precios contra el catálogo** en vez de confiar
en lo que manda el navegador — igual que hay que hacerlo con una pasarela real.

## Deploy en Vercel

El build usa el preset `vercel` de Nitro y genera `.vercel/output`
(Build Output API v3): las páginas salen estáticas y el SSR + las server
functions corren como una función serverless. Entra holgado en el plan gratuito.

```bash
npx vercel --prod
```

`vercel.json` ya trae la configuración. No hay variables de entorno que definir.

### Assets

Las imágenes venían de `/__l5e/assets-v1/...`, una ruta que solo existe dentro
del preview de Lovable. Están descargadas en `public/` con la misma ruta, así
que resuelven como archivos estáticos en Vercel y el proyecto sigue funcionando
igual dentro de Lovable. Si agregas imágenes nuevas desde el editor de Lovable,
vuelve a correr:

```bash
node scripts/fetch-assets.mjs
```

## Al migrar a Kajabi

1. Crear una **Offer** por cada curso ($197 … $397) y una para el bundle ($497).
2. En la Offer del bundle, añadir un **Payment Plan** de 3 cuotas.
3. En cada Offer de curso suelto, añadir **dos Order Bumps**: el curso
   complementario según la tabla de venta cruzada, y "los otros 4 cursos" al
   precio del upgrade.
4. Crear un **Sales Pipeline** con la página de upsell y, después, la de
   downsell, usando los mismos textos de `/oferta` y `/oferta-final`.
5. Apuntar los botones de la landing a la URL de checkout de cada Offer.

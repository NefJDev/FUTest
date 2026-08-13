# Checkout con upsell y downsell

Simulación del flujo de venta de Kajabi para mostrarle al cliente cómo va a
funcionar la tienda antes de pagar la suscripción.

> **No se cobra nada.** No hay pasarela de pago conectada. El número de tarjeta
> nunca sale del navegador: se valida el formato con Luhn y solo se envían los
> últimos 4 dígitos y la marca.

## El funnel

```
Elige 1 curso  →  [CARRITO]  →  UPSELL: "sumá los otros 4 por +$X"
                                   │
                        ┌──────────┴──────────┐
                     acepta                rechaza
                        │                     │
                 bundle $497          DOWNSELL: "3 cuotas de $165.67"
                                              │
                                   ┌──────────┴──────────┐
                                acepta                rechaza
                                   │                     │
                          bundle en 3 pagos      sigue con su curso
```

### Upsell — crédito del curso elegido

Lo que ya tiene en el carrito se le acredita contra el precio del bundle, así
que solo paga la diferencia hasta $497. Es lo que mejor convierte porque el
descuento se siente enorme:

| Curso en el carrito | Ya pagó | Paga ahora | Los otros 4 valen | Descuento |
| ------------------- | ------: | ---------: | ----------------: | --------: |
| Real Estate         |    $397 |      +$100 |              $938 |      −89% |
| Redes               |    $297 |      +$200 |            $1,038 |      −81% |
| Empresa de contenido|    $197 |      +$300 |            $1,138 |      −74% |

Casos borde ya contemplados: si junta cursos por más de $497 el upgrade sale
gratis, y si ya tiene los 5 sueltos se le ofrece cambiarlos por el bundle.

### Downsell — 3 cuotas sin recargo

Solo aparece **después** de rechazar el upsell. $497 repartidos en
`$165.67 + $165.67 + $165.66`, que suman exactamente $497 (el resto de la
división se carga a las primeras cuotas, nunca queda un total de $497.01).

## Probarlo

```bash
npm run dev
```

En el checkout hay dos tarjetas de prueba clickeables:

| Tarjeta               | Resultado      |
| --------------------- | -------------- |
| `4242 4242 4242 4242` | Pago aprobado  |
| `4000 0000 0000 0002` | Pago rechazado |

Cualquier vencimiento futuro y CVC sirven. La página de confirmación incluye un
bloque **"Recorrido de esta compra"** que muestra qué pasos del funnel se
dispararon — útil para explicarle el mecanismo al cliente. Ese bloque es solo de
la demo.

## Cómo está armado

| Archivo                                  | Qué hace                                                          |
| ---------------------------------------- | ----------------------------------------------------------------- |
| `src/lib/catalog.ts`                     | **Fuente única de verdad**: precios en centavos, cuotas, upsell    |
| `src/lib/cart.tsx`                       | Estado del carrito y del funnel, persistido en localStorage        |
| `src/lib/orders.ts`                      | Server function: revalida precios y crea la orden                  |
| `src/lib/card.ts`                        | Validación de tarjeta (Luhn, marca, vencimiento)                   |
| `src/components/checkout/OfferBlocks.tsx`| Los bloques de upsell y downsell                                   |
| `src/components/checkout/CartDrawer.tsx` | Carrito lateral                                                    |
| `src/routes/checkout.tsx`                | Formulario de pago y resumen                                       |
| `src/routes/gracias.tsx`                 | Confirmación y calendario de cuotas                                |

**Para cambiar cualquier precio, toca solo `src/lib/catalog.ts`.** La landing,
el carrito, el checkout y el servidor leen todos de ahí.

El servidor **recalcula todos los precios contra el catálogo** en vez de confiar
en los totales que manda el navegador — igual que hay que hacerlo con una
pasarela real. Un carrito manipulado desde la consola no cambia lo que se cobra.

## Deploy en Vercel

El build usa el preset `vercel` de Nitro y genera `.vercel/output`
(Build Output API v3): la landing sale estática y el SSR + las server functions
corren como una función serverless. Entra holgado en el plan gratuito.

Desde el dashboard de Vercel: **Add New → Project**, importá el repo y deployá.
`vercel.json` ya trae la configuración, no hay que tocar nada ni definir
variables de entorno.

Desde la terminal:

```bash
npx vercel --prod
```

### Assets

Las imágenes venían de `/__l5e/assets-v1/...`, una ruta que solo existe dentro
del preview de Lovable. Están descargadas en `public/` con la misma ruta, así
que resuelven como archivos estáticos en Vercel y el proyecto sigue funcionando
igual dentro de Lovable. Si agregas imágenes nuevas desde el editor de Lovable,
vuelve a correr:

```bash
node scripts/fetch-assets.mjs
```

## Migrar esto a Kajabi

Cuando se pague la suscripción, el mapeo es directo:

| Acá                              | En Kajabi                                  |
| -------------------------------- | ------------------------------------------ |
| Upsell en el carrito             | Order Bump en el checkout                  |
| Downsell tras rechazar           | Offer de downsell en el pipeline           |
| Plan de 3 cuotas                 | Payment Plan de la Offer                   |
| Cursos individuales / bundle     | Offers separadas y una Offer con los 5     |

Los precios, los textos y los porcentajes de esta demo son los mismos que hay
que cargar en Kajabi.

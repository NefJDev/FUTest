/**
 * Validación de tarjeta del lado del cliente.
 *
 * Es una demo: no hay pasarela y nada se cobra. Aun así el formulario valida
 * como uno real (Luhn, marca, vencimiento, CVC) para que el cliente vea el
 * comportamiento de errores, y el número completo nunca sale del navegador.
 */

export type CardBrand = "visa" | "mastercard" | "amex" | "discover" | "desconocida";

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function detectBrand(number: string): CardBrand {
  const digits = onlyDigits(number);
  if (/^4/.test(digits)) return "visa";
  if (/^(5[1-5]|2[2-7])/.test(digits)) return "mastercard";
  if (/^3[47]/.test(digits)) return "amex";
  if (/^6(?:011|5)/.test(digits)) return "discover";
  return "desconocida";
}

export function brandLabel(brand: CardBrand): string {
  switch (brand) {
    case "visa":
      return "Visa";
    case "mastercard":
      return "Mastercard";
    case "amex":
      return "Amex";
    case "discover":
      return "Discover";
    default:
      return "Tarjeta";
  }
}

/** Agrupa en bloques de 4 (o 4-6-5 para Amex) mientras se escribe. */
export function formatCardNumber(value: string): string {
  const digits = onlyDigits(value).slice(0, 19);
  const groups = detectBrand(digits) === "amex" ? [4, 6, 5] : [4, 4, 4, 4];

  const parts: string[] = [];
  let index = 0;
  for (const size of groups) {
    if (index >= digits.length) break;
    parts.push(digits.slice(index, index + size));
    index += size;
  }
  if (index < digits.length) parts.push(digits.slice(index));
  return parts.join(" ");
}

export function formatExpiry(value: string): string {
  const digits = onlyDigits(value).slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

/** Algoritmo de Luhn — el mismo checksum que usan las pasarelas reales. */
export function passesLuhn(number: string): boolean {
  const digits = onlyDigits(number);
  if (digits.length < 12) return false;

  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = Number(digits[i]);
    if (double) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    double = !double;
  }
  return sum % 10 === 0;
}

export function validateCardNumber(value: string): string | null {
  const digits = onlyDigits(value);
  if (!digits) return "Ingresa el número de tu tarjeta";
  const expected = detectBrand(digits) === "amex" ? 15 : 16;
  if (digits.length !== expected) return `El número debe tener ${expected} dígitos`;
  if (!passesLuhn(digits)) return "Ese número de tarjeta no es válido";
  return null;
}

export function validateExpiry(value: string): string | null {
  const digits = onlyDigits(value);
  if (digits.length !== 4) return "Usá el formato MM/AA";

  const month = Number(digits.slice(0, 2));
  const year = 2000 + Number(digits.slice(2));
  if (month < 1 || month > 12) return "Mes inválido";

  const now = new Date();
  // Último instante del mes de vencimiento.
  const expiresAt = new Date(year, month, 0, 23, 59, 59);
  if (expiresAt < now) return "La tarjeta está vencida";
  return null;
}

export function validateCvc(value: string, brand: CardBrand): string | null {
  const digits = onlyDigits(value);
  const expected = brand === "amex" ? 4 : 3;
  if (digits.length !== expected) return `El CVC debe tener ${expected} dígitos`;
  return null;
}

export function validateName(value: string): string | null {
  if (value.trim().length < 2) return "Ingresa tu nombre completo";
  return null;
}

export function validateEmail(value: string): string | null {
  const email = value.trim();
  if (!email) return "Ingresa tu email";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return "Ese email no parece válido";
  return null;
}

export function last4(number: string): string {
  return onlyDigits(number).slice(-4);
}

/** Tarjetas de prueba que se muestran en el aviso de demo del checkout. */
export const TEST_CARDS = [
  { number: "4242 4242 4242 4242", label: "Pago aprobado" },
  { number: "4000 0000 0000 0002", label: "Pago rechazado" },
] as const;

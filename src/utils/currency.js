/**
 * Formatea un número como precio en dólares (USD).
 * Ejemplo: 89.99 → "$89.99"
 */
export function formatCOP(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

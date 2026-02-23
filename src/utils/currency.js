/**
 * Formatea un número como precio en pesos colombianos (COP).
 * Ejemplo: 359000 → "$359.000"
 */
export function formatCOP(value) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value);
}

/** Estados de deuda permitidos (RN-02, RN-03, RN-04, RN-05). */
export const ESTADOS_DEUDA = ['Pendiente', 'Vencida', 'Pagada'];

/** Parámetro estadosListadoCobranzas (RN-02). */
export const ESTADOS_LISTADO_DEFAULT = ['Pendiente', 'Vencida'];

export const MSG_PAGO_MAYOR_SALDO = 'El pago no puede ser mayor que el saldo';
export const MSG_PAGO_INVALIDO = 'El monto del pago debe ser mayor que cero';
export const MSG_ACCESO_NO_AUTORIZADO = 'Acceso no autorizado';
export const MSG_SIN_DEUDAS = 'No hay deudas pendientes';

/**
 * RN-05: Si fecha actual > vencimiento y saldo > 0 → Vencida; si saldo 0 → Pagada.
 */
export function computeEstadoDeuda(fechaVencimiento, saldoPendiente, now = new Date()) {
  if (saldoPendiente <= 0) {
    return 'Pagada';
  }
  const venc = fechaVencimiento instanceof Date ? fechaVencimiento : new Date(fechaVencimiento);
  const hoy = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const vencDia = new Date(venc.getFullYear(), venc.getMonth(), venc.getDate());
  if (hoy > vencDia) {
    return 'Vencida';
  }
  return 'Pendiente';
}

/**
 * Valida monto de pago (RN-03, RN-04).
 * @returns {{ ok: true } | { ok: false, error: string }}
 */
export function validateMontoPago(monto, saldoPendiente) {
  const m = Number(monto);
  if (!Number.isFinite(m) || m <= 0) {
    return { ok: false, error: MSG_PAGO_INVALIDO };
  }
  if (m > saldoPendiente) {
    return { ok: false, error: MSG_PAGO_MAYOR_SALDO };
  }
  return { ok: true };
}

/**
 * Aplica un pago y devuelve nuevo saldo y estado (RN-03, RN-04, RN-05).
 */
export function applyPago(saldoPendiente, montoPago, fechaVencimiento, now = new Date()) {
  const validation = validateMontoPago(montoPago, saldoPendiente);
  if (!validation.ok) {
    return { ok: false, error: validation.error };
  }
  const m = Number(montoPago);
  const nuevoSaldo = Math.round((saldoPendiente - m) * 100) / 100;
  const estado = computeEstadoDeuda(fechaVencimiento, nuevoSaldo, now);
  return { ok: true, saldoPendiente: nuevoSaldo, estado };
}

export function isAdminRole(user) {
  if (!user) return false;
  const role = (user.role || '').toLowerCase();
  return role === 'admin' || role === 'administrador';
}

export function formatFechaCobranza(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '—';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

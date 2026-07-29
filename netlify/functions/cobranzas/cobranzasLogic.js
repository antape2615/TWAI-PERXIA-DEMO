const ESTADOS_DEUDA = ['Pendiente', 'Vencida', 'Pagada'];
const ESTADOS_LISTADO_DEFAULT = ['Pendiente', 'Vencida'];
const MSG_PAGO_MAYOR_SALDO = 'El pago no puede ser mayor que el saldo';
const MSG_PAGO_INVALIDO = 'El monto del pago debe ser mayor que cero';
const MSG_ACCESO_NO_AUTORIZADO = 'Acceso no autorizado';
const MSG_SIN_DEUDAS = 'No hay deudas pendientes';

function computeEstadoDeuda(fechaVencimiento, saldoPendiente, now = new Date()) {
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

function validateMontoPago(monto, saldoPendiente) {
  const m = Number(monto);
  if (!Number.isFinite(m) || m <= 0) {
    return { ok: false, error: MSG_PAGO_INVALIDO };
  }
  if (m > saldoPendiente) {
    return { ok: false, error: MSG_PAGO_MAYOR_SALDO };
  }
  return { ok: true };
}

function applyPago(saldoPendiente, montoPago, fechaVencimiento, now = new Date()) {
  const validation = validateMontoPago(montoPago, saldoPendiente);
  if (!validation.ok) {
    return { ok: false, error: validation.error };
  }
  const m = Number(montoPago);
  const nuevoSaldo = Math.round((saldoPendiente - m) * 100) / 100;
  const estado = computeEstadoDeuda(fechaVencimiento, nuevoSaldo, now);
  return { ok: true, saldoPendiente: nuevoSaldo, estado };
}

module.exports = {
  ESTADOS_DEUDA,
  ESTADOS_LISTADO_DEFAULT,
  MSG_PAGO_MAYOR_SALDO,
  MSG_PAGO_INVALIDO,
  MSG_ACCESO_NO_AUTORIZADO,
  MSG_SIN_DEUDAS,
  computeEstadoDeuda,
  validateMontoPago,
  applyPago,
};

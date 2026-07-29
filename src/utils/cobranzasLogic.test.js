import {
  MSG_PAGO_MAYOR_SALDO,
  MSG_PAGO_INVALIDO,
  computeEstadoDeuda,
  validateMontoPago,
  applyPago,
  isAdminRole,
} from './cobranzasLogic';

describe('cobranzasLogic — RN-05 computeEstadoDeuda', () => {
  it('marca Vencida si la fecha de vencimiento ya pasó y hay saldo', () => {
    const venc = new Date('2020-01-01');
    const now = new Date('2025-06-15');
    expect(computeEstadoDeuda(venc, 500, now)).toBe('Vencida');
  });

  it('mantiene Pendiente si el vencimiento es futuro', () => {
    const venc = new Date('2030-12-31');
    const now = new Date('2025-01-01');
    expect(computeEstadoDeuda(venc, 1000, now)).toBe('Pendiente');
  });

  it('marca Pagada cuando el saldo es cero', () => {
    const venc = new Date('2020-01-01');
    expect(computeEstadoDeuda(venc, 0)).toBe('Pagada');
  });
});

describe('cobranzasLogic — RN-03 y RN-04 pagos', () => {
  const vencimiento = new Date('2030-12-31');
  const now = new Date('2025-01-01');

  it('CA-05: pago total de $1000 deja saldo 0 y estado Pagada', () => {
    const result = applyPago(1000, 1000, vencimiento, now);
    expect(result.ok).toBe(true);
    expect(result.saldoPendiente).toBe(0);
    expect(result.estado).toBe('Pagada');
  });

  it('CA-06: rechaza pago mayor al saldo', () => {
    const validation = validateMontoPago(1500, 1000);
    expect(validation.ok).toBe(false);
    expect(validation.error).toBe(MSG_PAGO_MAYOR_SALDO);

    const result = applyPago(1000, 1500, vencimiento, now);
    expect(result.ok).toBe(false);
    expect(result.error).toBe(MSG_PAGO_MAYOR_SALDO);
  });

  it('CA-07: pago parcial de $300 deja saldo $700 en Pendiente', () => {
    const result = applyPago(1000, 300, vencimiento, now);
    expect(result.ok).toBe(true);
    expect(result.saldoPendiente).toBe(700);
    expect(result.estado).toBe('Pendiente');
  });

  it('rechaza montos <= 0', () => {
    expect(validateMontoPago(0, 1000).error).toBe(MSG_PAGO_INVALIDO);
    expect(validateMontoPago(-50, 1000).error).toBe(MSG_PAGO_INVALIDO);
  });
});

describe('cobranzasLogic — RN-01 isAdminRole', () => {
  it('acepta rol admin y administrador', () => {
    expect(isAdminRole({ role: 'admin' })).toBe(true);
    expect(isAdminRole({ role: 'Administrador' })).toBe(true);
  });

  it('rechaza usuarios sin rol admin', () => {
    expect(isAdminRole({ role: 'user' })).toBe(false);
    expect(isAdminRole({})).toBe(false);
    expect(isAdminRole(null)).toBe(false);
  });
});

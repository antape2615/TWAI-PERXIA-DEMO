const AUDIT_LOG_KEY = 'inventory_audit_log';

function readLog() {
  if (typeof localStorage === 'undefined') {
    return [];
  }
  try {
    const raw = localStorage.getItem(AUDIT_LOG_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeLog(entries) {
  if (typeof localStorage === 'undefined') {
    return;
  }
  localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(entries.slice(-1000)));
}

function auditConsoleEnabled() {
  return import.meta.env.VITE_ENABLE_AUDIT === 'true';
}

/**
 * @param {string} productId
 * @param {number} oldStock
 * @param {number} newStock
 * @param {string} reason
 * @param {string} [userId]
 */
export function logInventoryChange(productId, oldStock, newStock, reason, userId = 'system') {
  const timestamp = new Date().toISOString();
  const change = {
    id: `${productId}-${timestamp}`,
    productId,
    oldStock,
    newStock,
    difference: newStock - oldStock,
    reason,
    userId,
    timestamp,
  };

  const existingLog = readLog();
  existingLog.push(change);
  writeLog(existingLog);

  if (auditConsoleEnabled()) {
    console.info(`[audit] inventario ${productId}: ${oldStock} → ${newStock} (${reason})`);
  }

  return change;
}

export function getProductAuditHistory(productId) {
  return readLog().filter((entry) => entry.productId === productId);
}

export function getFullAuditLog() {
  return readLog();
}

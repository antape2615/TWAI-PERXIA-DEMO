const CATALOG_USER_ROLE = 'comprador';

/**
 * Registro simple de eventos de filtros en frontend.
 * No persiste datos; deja evidencia en consola para auditoría local.
 */
export function logCatalogFilterEvent(eventName, payload = {}) {
  const timestamp = new Date().toISOString();

  console.info('[CatalogFilterEvent]', {
    eventName,
    timestamp,
    userRole: CATALOG_USER_ROLE,
    ...payload,
  });
}

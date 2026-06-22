export function trackCatalogFilterEvent(eventName, payload = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    action: eventName,
    origin: 'catalog-ui',
    ...payload,
  };

  // Registro liviano de trazabilidad para QA y auditoría funcional.
  console.info('[CatalogFilters]', entry);
}

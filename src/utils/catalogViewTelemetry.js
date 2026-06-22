export function trackCatalogViewEvent(eventName, payload = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    action: eventName,
    origin: 'catalog-view-ui',
    ...payload,
  };

  console.info('[CatalogView]', entry);
}

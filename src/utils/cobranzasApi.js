const API_BASE = '/api/cobranzas';

function headers(adminEmail) {
  return {
    'Content-Type': 'application/json',
    'X-Admin-Email': adminEmail || '',
  };
}

export async function fetchCobranzasList(adminEmail, estadoFiltro = '') {
  const qs = new URLSearchParams();
  qs.set('adminEmail', adminEmail);
  if (estadoFiltro) qs.set('estado', estadoFiltro);
  const res = await fetch(`${API_BASE}?${qs.toString()}`, {
    headers: headers(adminEmail),
  });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

export async function fetchCobranzaDetalle(adminEmail, id) {
  const qs = new URLSearchParams({ adminEmail });
  const res = await fetch(`${API_BASE}/${id}?${qs.toString()}`, {
    headers: headers(adminEmail),
  });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

export async function registrarPago(adminEmail, id, { monto, tipoPago }) {
  const res = await fetch(`${API_BASE}/${id}/pagos`, {
    method: 'POST',
    headers: headers(adminEmail),
    body: JSON.stringify({ adminEmail, monto, tipoPago }),
  });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

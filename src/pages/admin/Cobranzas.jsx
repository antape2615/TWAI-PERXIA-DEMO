import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { formatCOP } from '../../utils/currency';
import {
  MSG_ACCESO_NO_AUTORIZADO,
  MSG_SIN_DEUDAS,
  formatFechaCobranza,
  isAdminRole,
} from '../../utils/cobranzasLogic';
import {
  fetchCobranzasList,
  fetchCobranzaDetalle,
  registrarPago,
} from '../../utils/cobranzasApi';
import styles from './Cobranzas.module.css';

const FILTROS = [
  { value: '', label: 'Pendiente y Vencida (inicial)' },
  { value: 'Pendiente', label: 'Pendiente' },
  { value: 'Vencida', label: 'Vencida' },
  { value: 'Pagada', label: 'Pagada' },
];

function EstadoBadge({ estado }) {
  const cls =
    estado === 'Vencida'
      ? styles.badgeVencida
      : estado === 'Pagada'
        ? styles.badgePagada
        : styles.badgePendiente;
  return <span className={`${styles.badge} ${cls}`}>{estado}</span>;
}

export default function Cobranzas() {
  const { user } = useAuth();
  const [tab, setTab] = useState('listado');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [items, setItems] = useState([]);
  const [mensajeVacio, setMensajeVacio] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [detalle, setDetalle] = useState(null);
  const [montoPago, setMontoPago] = useState('');
  const [tipoPago, setTipoPago] = useState('parcial');
  const [pagoError, setPagoError] = useState('');
  const [pagoLoading, setPagoLoading] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);

  const adminEmail = user?.email || '';

  const loadList = useCallback(async () => {
    if (!adminEmail) return;
    setLoading(true);
    setError('');
    setAccessDenied(false);
    try {
      const { res, data } = await fetchCobranzasList(adminEmail, filtroEstado);
      if (res.status === 403) {
        setAccessDenied(true);
        setItems([]);
        return;
      }
      if (!res.ok || !data.ok) {
        setError(data.error || 'No se pudo cargar el listado');
        return;
      }
      setItems(data.items || []);
      setMensajeVacio(data.mensajeVacio || '');
    } catch {
      setError('Error de conexión con el servicio de cobranzas');
    } finally {
      setLoading(false);
    }
  }, [adminEmail, filtroEstado]);

  const loadDetalle = useCallback(
    async (id) => {
      if (!adminEmail || !id) return;
      setLoading(true);
      setPagoError('');
      try {
        const { res, data } = await fetchCobranzaDetalle(adminEmail, id);
        if (res.status === 403) {
          setAccessDenied(true);
          return;
        }
        if (!res.ok || !data.ok) {
          setError(data.error || 'No se pudo cargar el detalle');
          return;
        }
        setDetalle(data.cobranza);
      } catch {
        setError('Error de conexión al cargar detalle');
      } finally {
        setLoading(false);
      }
    },
    [adminEmail],
  );

  useEffect(() => {
    if (!user) return;
    if (!isAdminRole(user)) {
      fetchCobranzasList(user.email).catch(() => {});
      return;
    }
    if (tab === 'listado') {
      loadList();
    }
  }, [user, tab, loadList]);

  useEffect(() => {
    if (selectedId && tab === 'detalle') {
      loadDetalle(selectedId);
    }
  }, [selectedId, tab, loadDetalle]);

  if (!user) {
    return <Navigate to="/login?from=/admin/cobranzas" replace />;
  }

  if (!isAdminRole(user)) {
    return (
      <div className={styles.wrapper}>
        <h1>Cobranzas</h1>
        <div className={styles.denied} role="alert">
          {MSG_ACCESO_NO_AUTORIZADO}
        </div>
        <p className={styles.subtitle}>
          <Link to="/">Volver al catálogo</Link>
        </p>
      </div>
    );
  }

  const openDetalle = (id) => {
    setSelectedId(id);
    setTab('detalle');
    setMontoPago('');
    setTipoPago('parcial');
    setPagoError('');
  };

  const handleRegistrarPago = async (e) => {
    e.preventDefault();
    if (!detalle || detalle.estado === 'Pagada') return;
    setPagoLoading(true);
    setPagoError('');
    const monto = tipoPago === 'total' ? detalle.saldoPendiente : Number(montoPago);
    const { res, data } = await registrarPago(adminEmail, detalle.id, {
      monto,
      tipoPago,
    });
    setPagoLoading(false);
    if (!res.ok || !data.ok) {
      setPagoError(data.error || 'No se pudo registrar el pago');
      return;
    }
    setDetalle(data.cobranza);
    setMontoPago('');
    if (data.cobranza.estado === 'Pagada') {
      setTab('listado');
      setSelectedId(null);
      loadList();
    }
  };

  const historialOrdenado = [...(detalle?.historialPagos || [])].sort(
    (a, b) => new Date(b.fecha) - new Date(a.fecha),
  );

  const showEmpty =
    tab === 'listado' && !loading && items.length === 0 && (mensajeVacio || filtroEstado === '');

  return (
    <div className={styles.wrapper}>
      <h1>Gestión de cobranzas</h1>
      <p className={styles.subtitle}>Panel administrativo — deudas pendientes y registro de pagos</p>

      {accessDenied && (
        <div className={styles.denied} role="alert">
          {MSG_ACCESO_NO_AUTORIZADO}
        </div>
      )}

      {error && !accessDenied && (
        <div className={styles.denied} role="alert">
          {error}
        </div>
      )}

      <div className={styles.tabs} role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'listado'}
          className={tab === 'listado' ? `${styles.tab} ${styles.tabActive}` : styles.tab}
          onClick={() => setTab('listado')}
        >
          Listado de deudas
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'detalle'}
          className={tab === 'detalle' ? `${styles.tab} ${styles.tabActive}` : styles.tab}
          onClick={() => selectedId && setTab('detalle')}
          disabled={!selectedId}
        >
          Detalle y pagos
        </button>
      </div>

      {tab === 'listado' && (
        <section className={styles.panel} aria-label="Listado de deudas">
          <div className={styles.filters}>
            <label htmlFor="filtro-estado">Filtrar por estado</label>
            <select
              id="filtro-estado"
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
            >
              {FILTROS.map((f) => (
                <option key={f.value || 'default'} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          {loading && <p className={styles.loading}>Cargando deudas…</p>}

          {showEmpty && (
            <p className={styles.emptyMsg}>{mensajeVacio || MSG_SIN_DEUDAS}</p>
          )}

          {!loading && items.length > 0 && (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Usuario</th>
                    <th>Saldo pendiente</th>
                    <th>Vencimiento</th>
                    <th>Estado</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {items.map((row) => (
                    <tr
                      key={row.id}
                      className={row.estado === 'Vencida' ? styles.rowVencida : undefined}
                    >
                      <td>
                        {row.estado === 'Vencida' && (
                          <span className={styles.vencidaIcon} aria-hidden="true">
                            ⚠️
                          </span>
                        )}
                        {row.nombreUsuario}
                      </td>
                      <td>{formatCOP(row.saldoPendiente)}</td>
                      <td>{formatFechaCobranza(row.fechaVencimiento)}</td>
                      <td>
                        <EstadoBadge estado={row.estado} />
                      </td>
                      <td>
                        <button
                          type="button"
                          className={styles.linkBtn}
                          onClick={() => openDetalle(row.id)}
                        >
                          Ver detalle
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && items.length === 0 && filtroEstado && !showEmpty && (
            <p className={styles.emptyMsg}>No hay deudas con estado «{filtroEstado}».</p>
          )}
        </section>
      )}

      {tab === 'detalle' && detalle && (
        <section className={styles.panel} aria-label="Detalle de deuda">
          <button
            type="button"
            className={styles.backBtn}
            onClick={() => {
              setTab('listado');
              loadList();
            }}
          >
            ← Volver al listado
          </button>

          <div className={styles.detailGrid}>
            <div className={styles.detailItem}>
              <label>Usuario</label>
              <strong>{detalle.nombreUsuario}</strong>
            </div>
            <div className={styles.detailItem}>
              <label>Monto inicial</label>
              <strong>{formatCOP(detalle.montoInicial)}</strong>
            </div>
            <div className={styles.detailItem}>
              <label>Saldo pendiente</label>
              <strong>{formatCOP(detalle.saldoPendiente)}</strong>
            </div>
            <div className={styles.detailItem}>
              <label>Fecha de vencimiento</label>
              <strong>{formatFechaCobranza(detalle.fechaVencimiento)}</strong>
            </div>
            <div className={styles.detailItem}>
              <label>Estado</label>
              <EstadoBadge estado={detalle.estado} />
            </div>
          </div>

          <h2 className={styles.historialTitle}>Historial de pagos y movimientos</h2>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Monto</th>
                  <th>Tipo</th>
                  <th>Registrado por</th>
                </tr>
              </thead>
              <tbody>
                {historialOrdenado.map((h, idx) => (
                  <tr key={`${h.fecha}-${idx}`}>
                    <td>{formatFechaCobranza(h.fecha)}</td>
                    <td>{h.monto > 0 ? formatCOP(h.monto) : '—'}</td>
                    <td>{h.tipoMovimiento}</td>
                    <td>{h.registradoPor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {detalle.estado !== 'Pagada' && (
            <form className={styles.pagoForm} onSubmit={handleRegistrarPago}>
              <h3>Registrar pago</h3>
              <div className={styles.field}>
                <span>Tipo de pago</span>
                <div className={styles.radioGroup}>
                  <label>
                    <input
                      type="radio"
                      name="tipoPago"
                      value="parcial"
                      checked={tipoPago === 'parcial'}
                      onChange={() => setTipoPago('parcial')}
                    />{' '}
                    Parcial
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="tipoPago"
                      value="total"
                      checked={tipoPago === 'total'}
                      onChange={() => setTipoPago('total')}
                    />{' '}
                    Total
                  </label>
                </div>
              </div>
              {tipoPago === 'parcial' && (
                <div className={styles.field}>
                  <label htmlFor="monto-pago">Monto del pago</label>
                  <input
                    id="monto-pago"
                    type="number"
                    min="1"
                    max={detalle.saldoPendiente}
                    step="1"
                    value={montoPago}
                    onChange={(e) => setMontoPago(e.target.value)}
                    required
                  />
                </div>
              )}
              {pagoError && (
                <p className={styles.error} role="alert">
                  {pagoError}
                </p>
              )}
              <button type="submit" className={styles.submitBtn} disabled={pagoLoading}>
                {pagoLoading ? 'Registrando…' : 'Registrar pago'}
              </button>
            </form>
          )}
        </section>
      )}

      {tab === 'detalle' && !detalle && loading && (
        <p className={styles.loading}>Cargando detalle…</p>
      )}
    </div>
  );
}

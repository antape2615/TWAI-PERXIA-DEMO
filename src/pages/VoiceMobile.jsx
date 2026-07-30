import { Link, useParams } from 'react-router-dom';
import { useRealtimeChat } from '../hooks/useRealtimeChat';
import styles from './VoiceMobile.module.css';

const STATUS_COPY = {
  idle: 'Listo',
  connecting: 'Conectando…',
  listening: 'Escuchando — habla ahora',
  speaking: 'El agente responde…',
  error: 'Error',
};

export default function VoiceMobile() {
  const { code } = useParams();
  const roomCode = (code || '').toUpperCase();
  const { status, error, connect, disconnect, isActive, profile } = useRealtimeChat({
    roomCode,
  });

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p className={styles.kicker}>Gestiona tus créditos</p>
        <h1>Micrófono móvil</h1>
        <p className={styles.code}>Sala {roomCode}</p>
      </header>

      <p className={styles.lead}>
        Activa el audio aquí. El dashboard en la web muestra la transcripción, el sentimiento y la
        traza en tiempo real.
      </p>

      <div className={`${styles.orb} ${styles[`orb_${status}`] || ''}`} aria-hidden="true" />

      <p className={styles.status}>{STATUS_COPY[status] || status}</p>
      <p className={styles.profile}>
        Sentimiento: <strong>{profile?.emotion || 'neutro'}</strong>
      </p>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <div className={styles.actions}>
        {!isActive ? (
          <button type="button" className={styles.micBtn} onClick={connect}>
            Activar micrófono
          </button>
        ) : (
          <button type="button" className={styles.hangBtn} onClick={disconnect}>
            Colgar
          </button>
        )}
      </div>

      <p className={styles.foot}>
        <Link to="/admin/cobranzas">Volver al dashboard</Link>
      </p>
    </div>
  );
}

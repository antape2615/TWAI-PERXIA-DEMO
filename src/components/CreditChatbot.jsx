import { useRealtimeChat } from '../hooks/useRealtimeChat';
import { profileLabel } from '../utils/realtimeProfile';
import styles from './CreditChatbot.module.css';

const STATUS_COPY = {
  idle: 'Listo para hablar',
  connecting: 'Conectando…',
  listening: 'Escuchando',
  speaking: 'Respondiendo',
  error: 'Error',
};

function emotionClass(emotion) {
  switch (emotion) {
    case 'frustrado':
    case 'ansioso':
      return styles.emotionAlert;
    case 'emocionado':
      return styles.emotionUp;
    case 'confundido':
      return styles.emotionSoft;
    default:
      return styles.emotionCalm;
  }
}

export default function CreditChatbot() {
  const { status, error, profile, transcripts, connect, disconnect, isActive } = useRealtimeChat();

  return (
    <aside className={styles.panel} aria-label="Asistente de voz Gestiona tus créditos">
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Gestiona tus créditos</p>
          <h2 className={styles.title}>Asistente de voz</h2>
        </div>
        <span className={`${styles.status} ${styles[`status_${status}`] || ''}`}>
          {STATUS_COPY[status] || status}
        </span>
      </header>

      <p className={styles.lead}>
        Habla por el micrófono. El agente adapta tono, velocidad, vocabulario y objetivos según tu
        perfil detectado en tiempo real.
      </p>

      <div className={styles.controls}>
        {!isActive ? (
          <button type="button" className={styles.primaryBtn} onClick={connect}>
            Iniciar conversación
          </button>
        ) : (
          <button type="button" className={styles.stopBtn} onClick={disconnect}>
            Colgar
          </button>
        )}
      </div>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <section className={styles.profileBox} aria-live="polite">
        <h3>Perfil temporal</h3>
        <p className={`${styles.profileSummary} ${emotionClass(profile.emotion)}`}>
          {profileLabel(profile)}
        </p>
        <dl className={styles.profileGrid}>
          <div>
            <dt>Edad aprox.</dt>
            <dd>{profile.ageBand}</dd>
          </div>
          <div>
            <dt>Nivel técnico</dt>
            <dd>{profile.technicalLevel}</dd>
          </div>
          <div>
            <dt>Emoción</dt>
            <dd>{profile.emotion}</dd>
          </div>
          <div>
            <dt>Ritmo</dt>
            <dd>{profile.speechPace}</dd>
          </div>
          <div>
            <dt>Respuestas</dt>
            <dd>{profile.responsePreference}</dd>
          </div>
          <div>
            <dt>Formalidad</dt>
            <dd>{profile.formality}</dd>
          </div>
        </dl>
      </section>

      {transcripts.length > 0 && (
        <section className={styles.transcript} aria-label="Transcripción">
          <h3>Conversación</h3>
          <ul>
            {transcripts.map((t) => (
              <li key={`${t.at}-${t.role}`} className={t.role === 'user' ? styles.userLine : styles.botLine}>
                <span>{t.role === 'user' ? 'Tú' : 'Agente'}</span>
                {t.text}
              </li>
            ))}
          </ul>
        </section>
      )}
    </aside>
  );
}

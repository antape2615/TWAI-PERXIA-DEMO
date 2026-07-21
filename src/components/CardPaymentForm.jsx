import { useState } from 'react';
import { formatCOP } from '../utils/currency';
import styles from './CardPaymentForm.module.css';

const formatCardNumber = (value) => {
  const v = value.replace(/\s/g, '').replace(/\D/g, '').slice(0, 16);
  return v.replace(/(.{4})/g, '$1 ').trim();
};

const formatExpiry = (value) => {
  const v = value.replace(/\D/g, '').slice(0, 4);
  if (v.length >= 2) return `${v.slice(0, 2)}/${v.slice(2)}`;
  return v;
};

const formatCvc = (value) => value.replace(/\D/g, '').slice(0, 4);

export default function CardPaymentForm({ total, onSuccess }) {
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [name, setName] = useState('');
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const handleCardNumber = (e) => {
    setCardNumber(formatCardNumber(e.target.value));
  };

  const handleExpiry = (e) => {
    setExpiry(formatExpiry(e.target.value));
  };

  const handleCvc = (e) => {
    setCvc(formatCvc(e.target.value));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const num = cardNumber.replace(/\s/g, '');
    if (num.length < 16) {
      setError('Número de tarjeta incompleto');
      return;
    }
    if (expiry.length < 5) {
      setError('Fecha de vencimiento incompleta');
      return;
    }
    if (cvc.length < 3) {
      setError('CVC incompleto');
      return;
    }
    if (!name.trim()) {
      setError('Nombre del titular requerido');
      return;
    }

    setProcessing(true);
    // Simular procesamiento de pago (demo, no real)
    await new Promise((r) => setTimeout(r, 1800));
    setProcessing(false);
    setDone(true);
    onSuccess?.();
  };

  if (done) {
    return (
      <div className={styles.success}>
        <div className={styles.successIcon} data-red-icon="true">✓</div>
        <h3>Pago procesado (simulado)</h3>
        <p>Este es un entorno de demostración. No se ha cobrado nada.</p>
      </div>
    );
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <p className={styles.disclaimer}>
        Modo demostración: ningún pago real. Los datos no se envían a ningún servidor.
      </p>

      <div className={styles.cardPreview}>
        <div className={styles.cardFront}>
          <div className={styles.chip} />
          <span className={styles.cardNumberDisplay}>{cardNumber || '•••• •••• •••• ••••'}</span>
          <div className={styles.cardBottom}>
            <span className={styles.cardNameDisplay}>{name || 'NOMBRE EN TARJETA'}</span>
            <span className={styles.cardExpiryDisplay}>{expiry || 'MM/AA'}</span>
          </div>
        </div>
      </div>

      <label className={styles.label}>
        Número de tarjeta
        <input
          type="text"
          inputMode="numeric"
          autoComplete="cc-number"
          placeholder="1234 5678 9012 3456"
          value={cardNumber}
          onChange={handleCardNumber}
          className={styles.input}
          maxLength={19}
        />
      </label>
      <label className={styles.label}>
        Nombre en la tarjeta
        <input
          type="text"
          autoComplete="cc-name"
          placeholder="Como aparece en la tarjeta"
          value={name}
          onChange={(e) => setName(e.target.value.toUpperCase())}
          className={styles.input}
        />
      </label>
      <div className={styles.row}>
        <label className={styles.label}>
          Vencimiento (MM/AA)
          <input
            type="text"
            inputMode="numeric"
            autoComplete="cc-exp"
            placeholder="12/28"
            value={expiry}
            onChange={handleExpiry}
            className={styles.input}
            maxLength={5}
          />
        </label>
        <label className={styles.label}>
          CVC
          <input
            type="text"
            inputMode="numeric"
            autoComplete="cc-csc"
            placeholder="123"
            value={cvc}
            onChange={handleCvc}
            className={styles.input}
            maxLength={4}
          />
        </label>
      </div>

      <div className={styles.total}>
        Total a pagar: <strong>{formatCOP(total)}</strong>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <button type="submit" className={styles.submitBtn} disabled={processing}>
        {processing ? (
          <>
            <span className={styles.spinner} />
            Procesando pago...
          </>
        ) : (
          'Pagar con tarjeta'
        )}
      </button>
    </form>
  );
}

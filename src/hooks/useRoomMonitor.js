import { useCallback, useEffect, useState } from 'react';
import { createAnalysisRoom, fetchAnalysisRoom } from '../utils/realtimeApi';
import { createDefaultProfile } from '../utils/realtimeProfile';

const EMPTY = {
  code: null,
  status: 'idle',
  mobileConnected: false,
  profile: createDefaultProfile(),
  transcripts: [],
  events: [],
  analysis: [],
  updatedAt: null,
};

/**
 * Crea/monitorea una sala de análisis (dashboard web).
 */
export function useRoomMonitor({ pollMs = 600, autoCreate = true } = {}) {
  const [room, setRoom] = useState(EMPTY);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(autoCreate);

  const createRoom = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { res, data } = await createAnalysisRoom();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'No se pudo crear la sala');
      }
      setRoom({
        code: data.code,
        status: data.status,
        mobileConnected: data.mobileConnected,
        profile: data.profile,
        transcripts: data.transcripts || [],
        events: data.events || [],
        analysis: data.analysis || [],
        updatedAt: data.updatedAt,
      });
      return data.code;
    } catch (err) {
      setError(err.message || 'Error al crear sala');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const attachToCode = useCallback(async (code) => {
    setLoading(true);
    setError('');
    try {
      const { res, data } = await fetchAnalysisRoom(code);
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Sala no encontrada');
      }
      setRoom({
        code: data.code,
        status: data.status,
        mobileConnected: data.mobileConnected,
        profile: data.profile,
        transcripts: data.transcripts || [],
        events: data.events || [],
        analysis: data.analysis || [],
        updatedAt: data.updatedAt,
      });
    } catch (err) {
      setError(err.message || 'Error al unirse a la sala');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (autoCreate) createRoom();
  }, [autoCreate, createRoom]);

  useEffect(() => {
    if (!room.code) return undefined;
    let cancelled = false;

    const tick = async () => {
      try {
        const { res, data } = await fetchAnalysisRoom(room.code);
        if (cancelled || !res.ok || !data.ok) return;
        setRoom({
          code: data.code,
          status: data.status,
          mobileConnected: data.mobileConnected,
          profile: data.profile,
          transcripts: data.transcripts || [],
          events: data.events || [],
          analysis: data.analysis || [],
          updatedAt: data.updatedAt,
        });
      } catch {
        /* ignore transient poll errors */
      }
    };

    const id = setInterval(tick, pollMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [room.code, pollMs]);

  return {
    room,
    error,
    loading,
    createRoom,
    attachToCode,
  };
}

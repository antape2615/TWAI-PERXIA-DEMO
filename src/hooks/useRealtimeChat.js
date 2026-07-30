import { useCallback, useEffect, useRef, useState } from 'react';
import { createRealtimeSession, syncAnalysisRoom, updateRealtimeProfile } from '../utils/realtimeApi';
import {
  buildRealtimeInstructions,
  createDefaultProfile,
  mergeProfile,
  PROFILE_TOOL,
} from '../utils/realtimeProfile';

const REALTIME_CALLS_URL = 'https://api.openai.com/v1/realtime/calls';

/**
 * Conexión WebRTC a OpenAI Realtime + publicación a sala de análisis.
 * @param {{ roomCode?: string | null }} options
 */
export function useRealtimeChat(options = {}) {
  const roomCode = options.roomCode || null;
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [profile, setProfile] = useState(() => createDefaultProfile());
  const [transcripts, setTranscripts] = useState([]);
  const [sessionId, setSessionId] = useState(null);

  const pcRef = useRef(null);
  const dcRef = useRef(null);
  const audioRef = useRef(null);
  const localStreamRef = useRef(null);
  const profileRef = useRef(profile);
  const sessionIdRef = useRef(null);
  const roomCodeRef = useRef(roomCode);

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  useEffect(() => {
    roomCodeRef.current = roomCode;
  }, [roomCode]);

  const publish = useCallback(async (payload) => {
    const code = roomCodeRef.current;
    if (!code) return;
    try {
      await syncAnalysisRoom(code, payload);
    } catch {
      /* best-effort para el dashboard */
    }
  }, []);

  const pushTranscript = useCallback(
    (role, text) => {
      if (!text?.trim()) return;
      const entry = { role, text: text.trim(), at: Date.now() };
      setTranscripts((prev) => [...prev.slice(-40), entry]);
      publish({
        transcript: entry,
        event: {
          type: role === 'user' ? 'user_speech' : 'agent_speech',
          label: role === 'user' ? 'Usuario habló' : 'Agente respondió',
          detail: entry.text.slice(0, 160),
          at: entry.at,
        },
      });
    },
    [publish],
  );

  const sendEvent = useCallback((event) => {
    const dc = dcRef.current;
    if (dc && dc.readyState === 'open') {
      dc.send(JSON.stringify(event));
    }
  }, []);

  const applySessionInstructions = useCallback(
    (nextProfile) => {
      sendEvent({
        type: 'session.update',
        session: {
          type: 'realtime',
          instructions: buildRealtimeInstructions(nextProfile),
          tools: [PROFILE_TOOL],
          tool_choice: 'auto',
        },
      });
    },
    [sendEvent],
  );

  const persistAndApplyProfile = useCallback(
    async (patch) => {
      const merged = mergeProfile(profileRef.current, patch);
      setProfile(merged);
      profileRef.current = merged;
      applySessionInstructions(merged);

      const sid = sessionIdRef.current;
      if (sid) {
        try {
          const { data } = await updateRealtimeProfile(sid, merged);
          if (data?.ok && data.profile) {
            const fromServer = mergeProfile(merged, data.profile);
            setProfile(fromServer);
            profileRef.current = fromServer;
          }
        } catch {
          /* ignore */
        }
      }

      publish({
        profile: merged,
        event: {
          type: 'analysis',
          label: 'Análisis de perfil',
          detail: `${merged.emotion} · técnico ${merged.technicalLevel} · ${merged.ageBand} · ritmo ${merged.speechPace}`,
        },
      });
      return merged;
    },
    [applySessionInstructions, publish],
  );

  const handleFunctionCall = useCallback(
    async (item) => {
      if (!item || item.name !== 'update_user_profile') return;
      let args = {};
      try {
        args = JSON.parse(item.arguments || '{}');
      } catch {
        args = {};
      }
      const merged = await persistAndApplyProfile(args);
      sendEvent({
        type: 'conversation.item.create',
        item: {
          type: 'function_call_output',
          call_id: item.call_id,
          output: JSON.stringify({ ok: true, profile: merged }),
        },
      });
      sendEvent({ type: 'response.create' });
    },
    [persistAndApplyProfile, sendEvent],
  );

  const setStatusAndPublish = useCallback(
    (next) => {
      setStatus(next);
      publish({
        status: next,
        mobileConnected: next !== 'idle' && next !== 'error',
        event: {
          type: 'status',
          label: `Estado: ${next}`,
          detail: '',
        },
      });
    },
    [publish],
  );

  const handleServerEvent = useCallback(
    (event) => {
      switch (event.type) {
        case 'input_audio_buffer.speech_started':
          setStatusAndPublish('listening');
          publish({
            event: {
              type: 'vad',
              label: 'Detección de voz',
              detail: 'El usuario comenzó a hablar',
            },
          });
          break;
        case 'output_audio_buffer.started':
        case 'response.output_audio.started':
          setStatusAndPublish('speaking');
          break;
        case 'output_audio_buffer.stopped':
        case 'response.output_audio.stopped':
          setStatusAndPublish('listening');
          break;
        case 'conversation.item.input_audio_transcription.completed':
          pushTranscript('user', event.transcript);
          break;
        case 'response.output_audio_transcript.done':
          pushTranscript('assistant', event.transcript);
          break;
        case 'response.done': {
          const outputs = event.response?.output || [];
          for (const item of outputs) {
            if (item.type === 'function_call') {
              handleFunctionCall(item);
            }
          }
          break;
        }
        case 'error':
          setError(event.error?.message || 'Error en la sesión Realtime');
          setStatusAndPublish('error');
          break;
        default:
          break;
      }
    },
    [handleFunctionCall, publish, pushTranscript, setStatusAndPublish],
  );

  const cleanup = useCallback(() => {
    try {
      dcRef.current?.close();
    } catch {
      /* ignore */
    }
    dcRef.current = null;
    try {
      pcRef.current?.close();
    } catch {
      /* ignore */
    }
    pcRef.current = null;
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.srcObject = null;
      audioRef.current = null;
    }
  }, []);

  const disconnect = useCallback(() => {
    cleanup();
    setStatus('idle');
    setSessionId(null);
    sessionIdRef.current = null;
    publish({
      status: 'ended',
      mobileConnected: false,
      event: { type: 'session_ended', label: 'Sesión finalizada', detail: '' },
    });
  }, [cleanup, publish]);

  const connect = useCallback(async () => {
    setError('');
    setStatus('connecting');
    setTranscripts([]);
    cleanup();
    publish({
      status: 'connecting',
      mobileConnected: true,
      event: { type: 'connecting', label: 'Conectando micrófono', detail: '' },
    });

    try {
      const { res, data } = await createRealtimeSession(roomCodeRef.current);
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'No se pudo crear la sesión de voz');
      }

      const ephemeralKey = data.clientSecret;
      sessionIdRef.current = data.sessionId;
      setSessionId(data.sessionId);
      const initialProfile = mergeProfile(createDefaultProfile(), data.profile);
      setProfile(initialProfile);
      profileRef.current = initialProfile;

      publish({
        sessionId: data.sessionId,
        profile: initialProfile,
        status: 'connecting',
        mobileConnected: true,
      });

      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      const audioEl = document.createElement('audio');
      audioEl.autoplay = true;
      audioEl.setAttribute('playsinline', 'true');
      audioRef.current = audioEl;
      pc.ontrack = (e) => {
        audioEl.srcObject = e.streams[0];
        audioEl.play().catch(() => {});
      };

      const ms = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = ms;
      pc.addTrack(ms.getTracks()[0]);

      const dc = pc.createDataChannel('oai-events');
      dcRef.current = dc;
      dc.addEventListener('open', () => {
        applySessionInstructions(profileRef.current);
        setStatusAndPublish('listening');
      });
      dc.addEventListener('message', (e) => {
        try {
          handleServerEvent(JSON.parse(e.data));
        } catch {
          /* ignore */
        }
      });

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const sdpResponse = await fetch(REALTIME_CALLS_URL, {
        method: 'POST',
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${ephemeralKey}`,
          'Content-Type': 'application/sdp',
        },
      });

      if (!sdpResponse.ok) {
        const errText = await sdpResponse.text();
        throw new Error(errText || 'Fallo al conectar con OpenAI Realtime');
      }

      const answer = { type: 'answer', sdp: await sdpResponse.text() };
      await pc.setRemoteDescription(answer);
    } catch (err) {
      cleanup();
      setStatus('error');
      setError(err.message || 'No se pudo iniciar el chatbot de voz');
      publish({
        status: 'error',
        mobileConnected: false,
        event: {
          type: 'error',
          label: 'Error de conexión',
          detail: err.message || '',
        },
      });
    }
  }, [applySessionInstructions, cleanup, handleServerEvent, publish, setStatusAndPublish]);

  useEffect(() => () => cleanup(), [cleanup]);

  return {
    status,
    error,
    profile,
    transcripts,
    sessionId,
    connect,
    disconnect,
    isActive: status === 'connecting' || status === 'listening' || status === 'speaking',
  };
}

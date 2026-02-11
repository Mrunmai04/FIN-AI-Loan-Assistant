import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, X, Activity, Volume2 } from 'lucide-react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string | undefined;
}

// Simple audio visualizer
const AudioVisualizer = ({ isActive }: { isActive: boolean }) => (
  <div className="flex gap-1 h-8 items-center justify-center">
    {[1, 2, 3, 4, 5].map((i) => (
      <div
        key={i}
        className={`w-2 bg-blue-500 rounded-full transition-all duration-150 ${
          isActive ? 'animate-pulse' : 'h-1'
        }`}
        style={{
          height: isActive ? `${Math.random() * 24 + 4}px` : '4px',
          animationDelay: `${i * 0.1}s`,
        }}
      />
    ))}
  </div>
);

export const GeminiLive: React.FC<Props> = ({ isOpen, onClose, apiKey }) => {
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Audio refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const inputNodeRef = useRef<ScriptProcessorNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);

  // Session refs
  const sessionRef = useRef<any>(null);
  const nextStartTimeRef = useRef(0);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const hasStartedRef = useRef(false); // ⭐ StrictMode guard

  /* ================= EFFECT ================= */

  useEffect(() => {
    if (!isOpen || !apiKey) {
      cleanup();
      hasStartedRef.current = false;
      return;
    }

    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

    startSession();

    return () => {
      cleanup();
      hasStartedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, apiKey]);

  /* ================= CLEANUP ================= */

  const cleanup = () => {
    activeSourcesRef.current.forEach((source) => {
      try {
        source.stop();
      } catch {}
    });
    activeSourcesRef.current.clear();
    nextStartTimeRef.current = 0;

    if (sessionRef.current) {
      sessionRef.current = null;
    }

    if (inputNodeRef.current) {
      inputNodeRef.current.disconnect();
      inputNodeRef.current = null;
    }

    if (sourceNodeRef.current) {
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (outputAudioContextRef.current) {
      outputAudioContextRef.current.close();
      outputAudioContextRef.current = null;
    }

    setIsSpeaking(false);
    setStatus('idle');
  };

  /* ================= SESSION ================= */

  const startSession = async () => {
    if (!apiKey) return;

    // 🚫 extra protection
    if (sessionRef.current) return;

    try {
      setStatus('connecting');
      const ai = new GoogleGenAI({ apiKey });

      audioContextRef.current = new AudioContext({ sampleRate: 16000 });
      outputAudioContextRef.current = new AudioContext({ sampleRate: 24000 });

      mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
          },
          systemInstruction:
            'You are a professional banking assistant for FinAI. Help with loans and finance.',
        },
        callbacks: {
          onopen: () => {
            setStatus('connected');
            setupAudioInput(sessionPromise);
          },

          onmessage: async (msg: LiveServerMessage) => {
            const ctx = outputAudioContextRef.current;
            if (!ctx) return;

            if (msg.serverContent?.interrupted) {
              activeSourcesRef.current.forEach((s) => {
                try {
                  s.stop();
                } catch {}
              });
              activeSourcesRef.current.clear();
              nextStartTimeRef.current = 0;
              setIsSpeaking(false);
              return;
            }

            const base64 = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (!base64) return;

            try {
              setIsSpeaking(true);
              if (ctx.state === 'suspended') await ctx.resume();

              const buffer = await decodeAudioData(
                decodeBase64(base64),
                ctx,
                24000,
                1
              );

              const source = ctx.createBufferSource();
              source.buffer = buffer;
              source.connect(ctx.destination);

              if (nextStartTimeRef.current < ctx.currentTime) {
                nextStartTimeRef.current = ctx.currentTime;
              }

              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              activeSourcesRef.current.add(source);

              source.onended = () => {
                activeSourcesRef.current.delete(source);
                if (!activeSourcesRef.current.size) setIsSpeaking(false);
              };
            } catch (e) {
              console.error(e);
            }
          },

          onclose: () => setStatus('idle'),
          onerror: () => setStatus('error'),
        },
      });

      sessionRef.current = sessionPromise;
    } catch (e) {
      console.error(e);
      setStatus('error');
    }
  };

  /* ================= AUDIO INPUT ================= */

  const setupAudioInput = (sessionPromise: Promise<any>) => {
    if (!audioContextRef.current || !mediaStreamRef.current) return;

    const source = audioContextRef.current.createMediaStreamSource(mediaStreamRef.current);
    sourceNodeRef.current = source;

    const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);
    inputNodeRef.current = processor;

    processor.onaudioprocess = (e) => {
      if (isMuted) return;

      const pcm16 = floatTo16BitPCM(e.inputBuffer.getChannelData(0));
      const base64 = arrayBufferToBase64(pcm16.buffer);

      sessionPromise
        .then((s) =>
          s.sendRealtimeInput({
            media: { mimeType: 'audio/pcm;rate=16000', data: base64 },
          })
        )
        .catch(() => {});
    };

    source.connect(processor);
    processor.connect(audioContextRef.current.destination);
  };

  /* ================= HELPERS ================= */

  const floatTo16BitPCM = (input: Float32Array) => {
    const output = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return output;
  };

  const arrayBufferToBase64 = (buffer: ArrayBuffer) =>
    btoa(String.fromCharCode(...new Uint8Array(buffer)));

  const decodeBase64 = (base64: string) =>
    Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

  async function decodeAudioData(
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    channels: number
  ) {
    const pcm = new Int16Array(data.buffer);
    const frameCount = pcm.length / channels;
    const buffer = ctx.createBuffer(channels, frameCount, sampleRate);

    for (let c = 0; c < channels; c++) {
      const channelData = buffer.getChannelData(c);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = pcm[i * channels + c] / 32768;
      }
    }
    return buffer;
  }

  if (!isOpen) return null;

  /* ================= UI ================= */

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400">
          <X size={24} />
        </button>

        <div className="flex flex-col items-center gap-8 py-8">
          <h2 className="text-2xl font-bold text-white">FinAI Voice Assistant</h2>
          <p className="text-slate-400">
            {status === 'connecting'
              ? 'Connecting...'
              : status === 'connected'
              ? 'Listening...'
              : status === 'error'
              ? 'Connection Failed'
              : 'Ready'}
          </p>

          <div className="w-32 h-32 rounded-full bg-slate-800 flex items-center justify-center">
            {status === 'connected' && <AudioVisualizer isActive={isSpeaking} />}
            {status === 'connecting' && <Activity className="animate-spin text-blue-400" />}
            {status === 'error' && <Volume2 className="text-red-400" />}
          </div>

          <div className="flex gap-6">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-4 rounded-full bg-slate-800 text-white"
            >
              {isMuted ? <MicOff /> : <Mic />}
            </button>
            <button onClick={onClose} className="px-6 py-3 rounded-full bg-slate-800 text-white">
              End Call
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

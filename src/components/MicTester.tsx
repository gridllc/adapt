import React, { useEffect, useState, useRef } from 'react';
import { MicIcon } from '@/components/Icons';

interface MicTesterProps {
  onSuccess: () => void;
}

export const MicTester: React.FC<MicTesterProps> = ({ onSuccess }) => {
  const [status, setStatus] = useState<'pending' | 'ok' | 'error'>('pending');
  const [volume, setVolume] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const checkMic = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        setStatus('ok');

        const context = new AudioContext();
        audioContextRef.current = context;
        const mic = context.createMediaStreamSource(stream);
        const analyser = context.createAnalyser();
        analyser.fftSize = 256;
        analyserRef.current = analyser;
        mic.connect(analyser);

        const data = new Uint8Array(analyser.frequencyBinCount);

        const checkVolume = () => {
          if (analyserRef.current) {
            analyserRef.current.getByteFrequencyData(data);
            const avg = data.reduce((a, b) => a + b, 0) / data.length;
            setVolume(avg);
          }
          animationFrameRef.current = requestAnimationFrame(checkVolume);
        };
        checkVolume();
        
        // Signal success after a short delay to show the visualizer
        setTimeout(() => {
            onSuccess();
        }, 1500);

      } catch (err) {
        console.error("Mic access error:", err);
        setStatus('error');
      }
    };

    checkMic();

    return () => {
      // Cleanup function to stop tracks and cancel animation frame
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [onSuccess]);

  return (
    <div className="flex items-center justify-center h-full bg-slate-900">
        <div className="p-8 bg-slate-800 rounded-2xl border border-slate-700 text-white text-center max-w-sm w-full shadow-2xl">
            <div className="flex items-center justify-center h-16 w-16 mx-auto mb-4 rounded-full bg-indigo-600/30">
                <MicIcon className="h-8 w-8 text-indigo-400" />
            </div>
            <h4 className="font-bold text-lg mb-2">Live Coach Setup</h4>
            {status === 'pending' && <p className="text-slate-400">Requesting microphone access...</p>}
            {status === 'ok' && (
                <>
                <p className="mb-4 text-slate-300">Your mic is working! Try speaking out loud.</p>
                <div className="w-full h-3 bg-slate-700 rounded-full overflow-hidden">
                    <div
                    className="h-3 bg-green-500 rounded-full transition-all duration-100"
                    style={{ width: `${Math.min(volume * 1.5, 100)}%` }} // Amplify the visual effect
                    ></div>
                </div>
                <p className="text-xs text-slate-500 mt-4">Starting coach...</p>
                </>
            )}
            {status === 'error' && (
                <p className="text-red-400">⚠️ Mic access denied or unavailable. Please check your browser settings and refresh the page.</p>
            )}
        </div>
    </div>
  );
};
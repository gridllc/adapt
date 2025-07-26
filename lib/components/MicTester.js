"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MicTester = void 0;
const react_1 = __importStar(require("react"));
const Icons_1 = require("@/components/Icons");
const MicTester = ({ onSuccess }) => {
    const [status, setStatus] = (0, react_1.useState)('pending');
    const [volume, setVolume] = (0, react_1.useState)(0);
    const audioContextRef = (0, react_1.useRef)(null);
    const analyserRef = (0, react_1.useRef)(null);
    const animationFrameRef = (0, react_1.useRef)(null);
    const streamRef = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(() => {
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
            }
            catch (err) {
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
    return (<div className="flex items-center justify-center h-full bg-slate-900">
        <div className="p-8 bg-slate-800 rounded-2xl border border-slate-700 text-white text-center max-w-sm w-full shadow-2xl">
            <div className="flex items-center justify-center h-16 w-16 mx-auto mb-4 rounded-full bg-indigo-600/30">
                <Icons_1.MicIcon className="h-8 w-8 text-indigo-400"/>
            </div>
            <h4 className="font-bold text-lg mb-2">Live Coach Setup</h4>
            {status === 'pending' && <p className="text-slate-400">Requesting microphone access...</p>}
            {status === 'ok' && (<>
                <p className="mb-4 text-slate-300">Your mic is working! Try speaking out loud.</p>
                <div className="w-full h-3 bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-3 bg-green-500 rounded-full transition-all duration-100" style={{ width: `${Math.min(volume * 1.5, 100)}%` }} // Amplify the visual effect
        ></div>
                </div>
                <p className="text-xs text-slate-500 mt-4">Starting coach...</p>
                </>)}
            {status === 'error' && (<p className="text-red-400">⚠️ Mic access denied or unavailable. Please check your browser settings and refresh the page.</p>)}
        </div>
    </div>);
};
exports.MicTester = MicTester;

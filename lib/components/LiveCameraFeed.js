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
exports.LiveCameraFeed = void 0;
const react_1 = __importStar(require("react"));
const useToast_1 = require("@/hooks/useToast");
const Icons_1 = require("@/components/Icons");
const DetectionOverlay_1 = require("@/components/DetectionOverlay");
// Convert the component to use forwardRef to expose the video element's ref
exports.LiveCameraFeed = (0, react_1.forwardRef)(({ instruction, onClick, detectedObjects }, ref) => {
    const [error, setError] = (0, react_1.useState)(null);
    const { addToast } = (0, useToast_1.useToast)();
    (0, react_1.useEffect)(() => {
        let stream = null;
        const startCamera = async () => {
            try {
                if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                    throw new Error("Camera access is not supported by your browser.");
                }
                stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: "environment" },
                    audio: false,
                });
                if (ref && 'current' in ref && ref.current) {
                    ref.current.srcObject = stream;
                }
            }
            catch (err) {
                console.error("Error accessing camera:", err);
                let message = "Could not access the camera. Please check your browser permissions.";
                if (err instanceof DOMException) {
                    if (err.name === "NotAllowedError") {
                        message = "Camera access was denied. Please grant permission in your browser settings.";
                    }
                    else if (err.name === "NotFoundError") {
                        message = "No camera was found on your device.";
                    }
                }
                setError(message);
                addToast('error', "Camera Error", message);
            }
        };
        startCamera();
        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [addToast, ref]);
    return (<div className="relative w-full h-full bg-slate-900 rounded-lg overflow-hidden shadow-xl border border-slate-700 cursor-pointer" onClick={onClick}>
        <video ref={ref} autoPlay playsInline muted className="w-full h-full object-cover" style={{ transform: 'scaleX(1)' }} // Force un-mirrored video
    />

        {/* Render the object detection overlay */}
        <DetectionOverlay_1.DetectionOverlay detectedObjects={detectedObjects}/>

        {error && (<div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white p-4">
            <Icons_1.VideoIcon className="h-16 w-16 text-red-500 mb-4"/>
            <h3 className="text-xl font-bold">Camera Error</h3>
            <p className="text-center mt-2">{error}</p>
          </div>)}

        {/* Instruction Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-black/60 backdrop-blur-md">
          <p className="text-white text-lg font-bold text-center drop-shadow-lg animate-fade-in-up">
            {instruction}
          </p>
        </div>
      </div>);
});
exports.LiveCameraFeed.displayName = 'LiveCameraFeed';

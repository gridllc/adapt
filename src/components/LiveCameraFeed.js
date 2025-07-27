import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { forwardRef, useEffect, useState } from 'react';
import { useToast } from '@/hooks/useToast';
import { VideoIcon } from '@/components/Icons';
import { DetectionOverlay } from '@/components/DetectionOverlay';
// Convert the component to use forwardRef to expose the video element's ref
export const LiveCameraFeed = forwardRef(({ instruction, onClick, detectedObjects }, ref) => {
    const [error, setError] = useState(null);
    const { addToast } = useToast();
    useEffect(() => {
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
    return (_jsxs("div", { className: "relative w-full h-full bg-slate-900 rounded-lg overflow-hidden shadow-xl border border-slate-700 cursor-pointer", onClick: onClick, children: [_jsx("video", { ref: ref, autoPlay: true, playsInline: true, muted: true, className: "w-full h-full object-cover", style: { transform: 'scaleX(1)' } }), _jsx(DetectionOverlay, { detectedObjects: detectedObjects }), error && (_jsxs("div", { className: "absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white p-4", children: [_jsx(VideoIcon, { className: "h-16 w-16 text-red-500 mb-4" }), _jsx("h3", { className: "text-xl font-bold", children: "Camera Error" }), _jsx("p", { className: "text-center mt-2", children: error })] })), _jsx("div", { className: "absolute bottom-0 left-0 right-0 p-4 bg-black/60 backdrop-blur-md", children: _jsx("p", { className: "text-white text-lg font-bold text-center drop-shadow-lg animate-fade-in-up", children: instruction }) })] }));
});
LiveCameraFeed.displayName = 'LiveCameraFeed';
//# sourceMappingURL=LiveCameraFeed.js.map
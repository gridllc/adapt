import { jsx as _jsx } from "react/jsx-runtime";
import { forwardRef } from 'react';
export const VideoPlayer = forwardRef(({ video_url, onTimeUpdate }, ref) => {
    const handleTimeUpdate = (event) => {
        onTimeUpdate(event.currentTarget.currentTime);
    };
    if (!video_url)
        return null;
    return (_jsx("video", { ref: ref, src: video_url, controls: true, onTimeUpdate: handleTimeUpdate, className: "w-full h-full object-cover", playsInline: true }));
});
VideoPlayer.displayName = 'VideoPlayer';
//# sourceMappingURL=VideoPlayer.js.map
import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
export const DetectionOverlay = ({ detectedObjects }) => {
    if (detectedObjects.length === 0) {
        return null;
    }
    return (_jsx("div", { className: "absolute inset-0 w-full h-full pointer-events-none", children: detectedObjects.map((obj, index) => {
            const [xMin, yMin, xMax, yMax] = obj.box;
            const style = {
                position: 'absolute',
                left: `${xMin * 100}%`,
                top: `${yMin * 100}%`,
                width: `${(xMax - xMin) * 100}%`,
                height: `${(yMax - yMin) * 100}%`,
            };
            const scoreText = obj.score ? `(${(obj.score * 100).toFixed(0)}%)` : '';
            return (_jsx("div", { style: style, className: "border-2 border-green-400 rounded-md animate-fade-in-up flex justify-center items-start", children: _jsxs("span", { className: "bg-green-400 text-slate-900 text-xs font-bold px-2 py-0.5 rounded -translate-y-full", children: [obj.label, " ", scoreText] }) }, index));
        }) }));
};
//# sourceMappingURL=DetectionOverlay.js.map
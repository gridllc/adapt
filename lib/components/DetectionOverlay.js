"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DetectionOverlay = void 0;
const react_1 = __importDefault(require("react"));
const DetectionOverlay = ({ detectedObjects }) => {
    if (detectedObjects.length === 0) {
        return null;
    }
    return (<div className="absolute inset-0 w-full h-full pointer-events-none">
      {detectedObjects.map((obj, index) => {
            const [xMin, yMin, xMax, yMax] = obj.box;
            const style = {
                position: 'absolute',
                left: `${xMin * 100}%`,
                top: `${yMin * 100}%`,
                width: `${(xMax - xMin) * 100}%`,
                height: `${(yMax - yMin) * 100}%`,
            };
            const scoreText = obj.score ? `(${(obj.score * 100).toFixed(0)}%)` : '';
            return (<div key={index} style={style} className="border-2 border-green-400 rounded-md animate-fade-in-up flex justify-center items-start">
            <span className="bg-green-400 text-slate-900 text-xs font-bold px-2 py-0.5 rounded -translate-y-full">
              {obj.label} {scoreText}
            </span>
          </div>);
        })}
    </div>);
};
exports.DetectionOverlay = DetectionOverlay;

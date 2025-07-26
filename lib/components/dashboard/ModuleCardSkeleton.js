"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModuleCardSkeleton = void 0;
const react_1 = __importDefault(require("react"));
const ModuleCardSkeleton = () => {
    return (<div className="p-4 bg-slate-100 dark:bg-slate-900/50 rounded-lg animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-5 w-48 bg-slate-200 dark:bg-slate-700 rounded"></div>
          <div className="h-4 w-64 bg-slate-200 dark:bg-slate-700 rounded"></div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-8 w-16 bg-slate-200 dark:bg-slate-700 rounded-md"></div>
          <div className="h-8 w-12 bg-slate-200 dark:bg-slate-700 rounded-md"></div>
          <div className="h-8 w-8 bg-slate-200 dark:bg-slate-700 rounded-md"></div>
        </div>
      </div>
    </div>);
};
exports.ModuleCardSkeleton = ModuleCardSkeleton;

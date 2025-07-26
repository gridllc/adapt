"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModuleCardSkeleton = void 0;
const react_1 = __importDefault(require("react"));
const Icons_1 = require("@/components/Icons");
const ModuleCardSkeleton = () => {
    return (<div className="block p-6 bg-white dark:bg-slate-800 rounded-xl shadow-md">
      <div className="flex items-center gap-4 animate-pulse">
        <div className="bg-slate-200 dark:bg-slate-700 p-3 rounded-lg">
          <Icons_1.BookOpenIcon className="h-6 w-6 text-slate-400 dark:text-slate-500"/>
        </div>
        <div className="flex-1">
          <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/4 mt-2"></div>
        </div>
      </div>
    </div>);
};
exports.ModuleCardSkeleton = ModuleCardSkeleton;

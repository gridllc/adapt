
type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

interface AlternativeMethod {
  title: string;
  description: string;
  [key: string]: Json | undefined;
}

interface TranscriptLine {
  start: number;
  end: number;
  text: string;
  [key: string]: Json | undefined;
}

interface ProcessStep {
  start: number;
  end: number;
  title: string;
  description: string;
  checkpoint: string | null;
  alternativeMethods: AlternativeMethod[];
  [key: string]: Json | undefined;
}

// Stricter application-level types for modules
interface AppModule {
  slug: string;
  title: string;
  steps: ProcessStep[];
  transcript: TranscriptLine[];
  created_at: string;
  metadata: Json | null;
  user_id: string | null;
  video_url: string | null;
}

interface AppModuleWithStats {
  slug: string | null;
  title: string | null;
  steps: ProcessStep[];
  transcript: TranscriptLine[];
  created_at: string | null;
  is_ai_generated?: boolean | null;
  last_used_at?: string | null;
  metadata: Json | null;
  session_count?: number | null;
  user_id: string | null;
  video_url: string | null;
}

// Alias AppModule for use in LiveCoachPage
type TrainingModule = AppModule;

interface ModuleForInsert {
  created_at?: string;
  metadata?: Json | null;
  slug: string;
  steps?: Json | null;
  title: string;
  transcript?: Json | null;
  user_id?: string | null;
  video_url?: string | null;
}

interface CheckpointResponse {
  answer: string;
  checkpoint_text: string;
  comment: string | null;
  created_at: string;
  id: string;
  module_id: string;
  step_index: number;
  user_id: string;
}


interface VideoMetadata {
  originalName: string;
  size: number;
  duration: number;
  width: number;
  height: number;
  [key: string]: Json | undefined;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  citations?: { uri: string; title?: string; }[];
  isFallback?: boolean;
  imageUrl?: string; // For generated images
  isLoading?: boolean; // For showing loading indicators on a specific message
  isError?: boolean; // For displaying an inline error message
  feedback?: 'good' | 'bad' | null;
  memoryMatches?: TutorLog[];
  embeddingSource?: string;
}

interface GroundingChunk {
  web?: {
    uri: string;
    title?: string;
  };
}

type StepStatus = 'done' | 'unclear' | 'skipped';

interface UserAction {
  stepIndex: number;
  status: StepStatus;
  timestamp: number;
}

interface VideoAnalysisResult {
  timestamps: { start: number; end: number }[];
  transcript: TranscriptLine[];
}

interface TraineeSuggestion {
  id: string;
  moduleId: string;
  stepIndex: number;
  text: string;
  status: 'pending' | 'approved' | 'rejected';
}

interface AiSuggestion {
  id: string;
  moduleId: string;
  stepIndex: number;
  originalInstruction: string;
  suggestion: string;
  sourceQuestions: string[];
  createdAt: string;
}

interface FlaggedQuestion {
  id: string;
  moduleId: string;
  stepIndex: number;
  userQuestion: string;
  comment: string | null;
  userId: string | null;
  createdAt: string;
  tutorLogId: string | null;
  tutorResponse: string | null;
}

interface AnalysisHotspot {
  stepIndex: number;
  stepTitle: string;
  questions: string[];
  questionCount: number;
}

interface RefinementSuggestion {
  newDescription: string;
  newAlternativeMethod: AlternativeMethod | null;
}

interface GeneratedBranchModule {
  title: string;
  steps: string[];
}

interface PerformanceReportData {
  moduleTitle: string;
  completionDate: string;
  aiFeedback: string;
  unclearSteps: ProcessStep[];
  userQuestions: string[];
}

type CoachEventType = 'hint' | 'correction' | 'tutoring' | 'step_advance' | 'hinting' | 'correcting';

interface LiveCoachEvent {
  eventType: CoachEventType;
  stepIndex: number;
  timestamp: number;
}

interface SessionState {
  moduleId: string;
  sessionToken: string;
  currentStepIndex: number;
  userActions: UserAction[];
  isCompleted: boolean;
  liveCoachEvents?: LiveCoachEvent[]; // Optional for backward compatibility with older session data
  score?: number;
}

interface SessionSummary extends SessionState {
  startedAt: number;
  endedAt: number;
  durationsPerStep: Record<number, number>; // in milliseconds
}

interface QuestionStats {
  question: string;
  count: number;
  stepIndex: number;
}

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface AuthUser {
  id: string;
  email?: string;
  app_metadata: {
    provider?: string;
    [key: string]: unknown;
  };
}

interface CheckpointEvaluation {
  isCorrect: boolean;
  feedback: string;
  suggestedInstructionChange?: string;
}

interface DetectedObject {
  label: string;
  score?: number; // Confidence score from the model
  box: [number, number, number, number]; // [xMin, yMin, xMax, yMax] as percentages
}

interface StepNeeds {
  required: string[];
  forbidden: string[];
  branchOn?: { item: string; module: string }[];
}

type ModuleNeeds = Record<string, Record<number, StepNeeds>>;

interface TutorLog {
  id: string;
  user_question: string;
  tutor_response: string;
  similarity?: number;
}

interface TutorLogRow {
  id: string;
  module_id: string;
  step_index: number | null;
  user_question: string;
  tutor_response: string;
  created_at: string | null;
}

interface AIFeedbackLog {
  id: string;
  sessionToken: string;
  moduleId: string;
  stepIndex: number;
  userPrompt: string;
  aiResponse: string;
  feedback: 'good' | 'bad';
  userFixText?: string;
  fixEmbedding?: number[];
  createdAt: string;
}

interface SimilarFix {
  id: string;
  userFixText: string;
  similarity: number;
}

export type {
  Json,
  AlternativeMethod,
  TranscriptLine,
  ProcessStep,
  AppModule,
  AppModuleWithStats,
  TrainingModule,
  ModuleForInsert,
  CheckpointResponse,
  VideoMetadata,
  ChatMessage,
  GroundingChunk,
  StepStatus,
  UserAction,
  VideoAnalysisResult,
  TraineeSuggestion,
  AiSuggestion,
  FlaggedQuestion,
  AnalysisHotspot,
  RefinementSuggestion,
  GeneratedBranchModule,
  PerformanceReportData,
  CoachEventType,
  LiveCoachEvent,
  SessionState,
  SessionSummary,
  QuestionStats,
  ToastType,
  Toast,
  AuthUser,
  CheckpointEvaluation,
  DetectedObject,
  StepNeeds,
  ModuleNeeds,
  TutorLog,
  TutorLogRow,
  AIFeedbackLog,
  SimilarFix
};

/**
 * Lesson Data Model for RoboKids Vietnam STEM Platform
 *
 * Supports age groups: 6-8 (Beginner), 9-12 (Intermediate), 13-16 (Advanced)
 */

export type AgeGroup = 'beginner' | 'intermediate' | 'advanced';
export type LessonCategory = 'movement' | 'sensors' | 'logic' | 'sound' | 'creativity' | 'challenges' | 'competitions' | 'music' | 'loops' | 'innovation' | 'collaboration' | 'algorithm';
export type BlockDifficulty = 'basic' | 'intermediate' | 'advanced';

/** A single step/instruction within a lesson */
export interface LessonStep {
  id: string;
  order: number;
  /** Short title displayed in step list */
  title: string;
  /** Vietnamese step description shown to student */
  descriptionVi: string;
  /** English step description (optional, falls back to descriptionVi) */
  descriptionEn?: string;
  /** Block type IDs available for this step (empty = any from lesson) */
  allowedBlocks: string[];
  /** Vietnamese label */
  labelVi: string;
  /** English label */
  labelEn: string;
  /** Hint shown to student */
  hint?: string;
  /** Expected block XML to auto-validate correct solution */
  expectedXml?: string;
}

/** Subscription tier required to access content */
export type ContentTier = 'sao_hoa' | 'moc_tinh';

/** A lesson module */
export interface Lesson {
  id: string;
  slug: string;
  /** Display title (falls back to titleVi) */
  title: string;
  titleVi: string;
  titleEn: string;
  /** Short Vietnamese description for curriculum browser */
  descriptionVi: string;
  /** Short English description */
  descriptionEn: string;
  /** Age group */
  ageGroup: AgeGroup;
  /** Lesson category */
  category: LessonCategory;
  /** Difficulty level */
  difficulty: BlockDifficulty;
  /** Estimated time in minutes */
  estimatedMinutes: number;
  /** Learning objectives (English) */
  objectives: string[];
  /** Learning objectives (Vietnamese) */
  objectivesVi: string[];
  /** Sequential steps student follows */
  steps: LessonStep[];
  /** Blockly workspace XML to pre-load */
  starterXml?: string;
  /** Block IDs available for this lesson (subset of all blocks) */
  availableBlocks: string[];
  /** Progression to next lesson */
  nextLessonSlug?: string;
  /** Tags for search and filtering */
  tags: string[];
  /** Version for content updates */
  version: number;
  /** Author */
  author: string;
  /** Content rating: how complete/ready (1-5) */
  contentRating: number;
  /** Subscription tier required to access this lesson (default: sao_hoa/free) */
  requiredTier?: ContentTier;
}

/** Student progress on a lesson */
export interface StudentLessonProgress {
  lessonId: string;
  studentId: string;
  status: 'not_started' | 'in_progress' | 'completed';
  completedSteps: string[];
  lastStepId?: string;
  attempts: number;
  completedAt?: string;
  timeSpentSeconds: number;
}

/** Full curriculum for an age group */
export interface Curriculum {
  ageGroup: AgeGroup;
  titleVi: string;
  titleEn: string;
  descriptionVi: string;
  descriptionEn: string;
  lessons: Lesson[];
  totalLessons: number;
  totalHours: number;
  /** Minimum age in this group */
  minAge: number;
  /** Maximum age in this group */
  maxAge: number;
}

/** Age-group specific Blockly block configuration */
export interface AgeGroupBlockConfig {
  ageGroup: AgeGroup;
  /** Blocks shown in toolbox (by type id) */
  availableBlocks: string[];
  /** Blocks disabled by default */
  disabledBlocks: string[];
  /** Custom Vietnamese labels for blocks */
  blockLabelsVi: Record<string, string>;
  /** Whether to show Python/code preview */
  showCodePreview: boolean;
  /** Max nested loop depth allowed */
  maxLoopDepth: number;
  /** Max total blocks per program */
  maxBlocks?: number;
}

/** Teacher-facing lesson plan document */
export interface LessonPlan {
  lessonId: string;
  teacherNotesVi: string;
  teacherNotesEn: string;
  commonMistakesVi: string[];
  commonMistakesEn: string[];
  extensionsVi: string[];
  extensionsEn: string[];
  /** Materials needed for the lesson (e.g. "robot kit, maze mat") */
  materialsVi: string[];
  materialsEn: string[];
}

/** Quiz question for post-lesson assessment */
export interface QuizQuestion {
  id: string;
  lessonId: string;
  order: number;
  /** Multiple choice, true_false, or open */
  type: 'multiple_choice' | 'true_false' | 'open';
  questionVi: string;
  questionEn: string;
  optionsVi?: string[];
  optionsEn?: string[];
  correctAnswer: string | number;
  explanationVi?: string;
  explanationEn?: string;
}

/** Student quiz attempt */
export interface QuizAttempt {
  id: string;
  studentId: string;
  lessonId: string;
  score: number;
  totalQuestions: number;
  answers: Record<string, string | number>;
  completedAt: string;
}

/** Learning standard alignment (Vietnamese curriculum refs) */
export interface LearningStandard {
  id: string;
  code: string;
  descriptionVi: string;
  descriptionEn: string;
  /** Related lesson slugs */
  lessonSlugs: string[];
}

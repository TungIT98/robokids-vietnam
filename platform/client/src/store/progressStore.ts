import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface LessonProgress {
  lessonId: string;
  studentId: string;
  status: 'not_started' | 'in_progress' | 'completed';
  completedSteps: string[];
  lastStepId: string | null;
  attempts: number;
  completedAt?: string;
  timeSpentSeconds: number;
}

interface ProgressState {
  lessonProgress: Record<string, LessonProgress>;
  isHydrated: boolean;

  // Actions
  getLessonProgress: (lessonSlug: string) => LessonProgress | null;
  saveLessonProgress: (lessonSlug: string, progress: Partial<LessonProgress> & { lessonId: string }) => void;
  updateStepCompletion: (lessonSlug: string, lessonId: string, stepId: string, completed: boolean) => void;
  resetLessonProgress: (lessonSlug: string) => void;
  setHydrated: (value: boolean) => void;
}

const getStorageKey = (lessonSlug: string) => `lesson_progress_${lessonSlug}`;

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      lessonProgress: {},
      isHydrated: false,

      getLessonProgress: (lessonSlug: string) => {
        const stored = localStorage.getItem(getStorageKey(lessonSlug));
        if (stored) {
          try {
            return JSON.parse(stored) as LessonProgress;
          } catch {
            return null;
          }
        }
        return get().lessonProgress[lessonSlug] || null;
      },

      saveLessonProgress: (lessonSlug: string, progress: Partial<LessonProgress> & { lessonId: string }) => {
        const fullProgress: LessonProgress = {
          lessonId: progress.lessonId,
          studentId: progress.studentId || 'local',
          status: progress.status || 'not_started',
          completedSteps: progress.completedSteps || [],
          lastStepId: progress.lastStepId || null,
          attempts: progress.attempts || 0,
          timeSpentSeconds: progress.timeSpentSeconds || 0,
        };
        set((state) => ({
          lessonProgress: {
            ...state.lessonProgress,
            [lessonSlug]: fullProgress,
          },
        }));
        localStorage.setItem(getStorageKey(lessonSlug), JSON.stringify(fullProgress));
      },

      updateStepCompletion: (lessonSlug: string, lessonId: string, stepId: string, completed: boolean) => {
        const existing = get().getLessonProgress(lessonSlug);
        const completedSteps = existing?.completedSteps || [];

        let newCompletedSteps: string[];
        if (completed) {
          newCompletedSteps = completedSteps.includes(stepId)
            ? completedSteps
            : [...completedSteps, stepId];
        } else {
          newCompletedSteps = completedSteps.filter((id) => id !== stepId);
        }

        get().saveLessonProgress(lessonSlug, {
          lessonId,
          studentId: existing?.studentId || 'local',
          status: newCompletedSteps.length > 0 ? 'in_progress' : 'not_started',
          completedSteps: newCompletedSteps,
          lastStepId: stepId,
          attempts: existing?.attempts || 0,
          timeSpentSeconds: existing?.timeSpentSeconds || 0,
        });
      },

      resetLessonProgress: (lessonSlug: string) => {
        set((state) => {
          const { [lessonSlug]: _, ...rest } = state.lessonProgress;
          return { lessonProgress: rest };
        });
        localStorage.removeItem(getStorageKey(lessonSlug));
      },

      setHydrated: (value: boolean) => set({ isHydrated: value }),
    }),
    {
      name: 'robokids-progress',
      partialize: (state) => ({
        lessonProgress: state.lessonProgress,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    }
  )
);

// Selectors
export const selectLessonProgress = (lessonSlug: string) => (state: ProgressState) =>
  state.lessonProgress[lessonSlug] || null;
export const selectIsHydrated = (state: ProgressState) => state.isHydrated;

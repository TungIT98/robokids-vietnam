import { pocketbase, isPocketBaseConfigured } from './pocketbase';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3100';

export interface AgeGroupConfig {
  ageGroup: string;
  availableBlocks: string[];
  disabledBlocks: string[];
  showCodePreview: boolean;
  maxLoopDepth: number;
  blockLabelsVi: Record<string, string>;
  blockLabelsEn: Record<string, string>;
  totalLessons: number;
}

export interface LessonObjective {
  id: string;
  textVi: string;
  textEn: string;
}

export interface LessonStep {
  id: string;
  stepKey: string;
  stepOrder: number;
  title: string;
  titleVi: string;
  titleEn: string;
  descriptionVi: string;
  descriptionEn: string;
  allowedBlocks: string[];
  suggestedBlocks: string[];
  blockedBlocks: string[];
  hintVi: string;
  hintEn: string;
  expectedOutput?: string;
}

export interface Lesson {
  id: string;
  slug: string;
  title: string;
  titleVi: string;
  titleEn: string;
  descriptionVi: string;
  descriptionEn: string;
  ageGroup: string;
  category: string;
  difficulty: string;
  estimatedMinutes: number;
  orderIndex: number;
  nextLessonSlug: string | null;
  previousLessonSlug: string | null;
  tags: string[];
  objectives: LessonObjective[];
  steps: LessonStep[];
  userProgress?: {
    completed: boolean;
    completedAt: string | null;
    completedSteps: string[];
    timeSpentSeconds: number;
    lastWorkspaceXml: string | null;
    studentRating: number | null;
  } | null;
}

export interface CurriculumResponse {
  ageGroup: string;
  config: AgeGroupConfig;
  lessons: Lesson[];
}

async function handleResponse<T>(response: Response): Promise<T> {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'An error occurred');
  }
  return data;
}

export const curriculumApi = {
  // Get all age groups with lesson counts (uses API or PocketBase)
  getAgeGroups: async (): Promise<AgeGroupConfig[]> => {
    if (isPocketBaseConfigured() && pocketbase) {
      let ageGroups: any[] = [];
      try {
        const result = await pocketbase.collection('age_group_configs').getList(1, 100);
        ageGroups = result.items;
      } catch (e: any) {
        if (e.status !== 404) throw e;
      }

      let lessons: any[] = [];
      try {
        const result = await pocketbase.collection('lessons').getList(1, 1000, {
          fields: 'age_group',
        });
        lessons = result.items;
      } catch (e: any) {
        if (e.status !== 404) console.warn('Failed to fetch lessons:', e);
      }

      const lessonCounts: Record<string, number> = {};
      for (const lesson of lessons || []) {
        lessonCounts[lesson.age_group] = (lessonCounts[lesson.age_group] || 0) + 1;
      }

      return ageGroups.map((config: any) => ({
        ageGroup: config.age_group,
        availableBlocks: config.available_blocks || [],
        disabledBlocks: config.disabled_blocks || [],
        showCodePreview: config.show_code_preview ?? true,
        maxLoopDepth: config.max_loop_depth ?? 3,
        blockLabelsVi: config.block_labels_vi || {},
        blockLabelsEn: config.block_labels_en || {},
        totalLessons: lessonCounts[config.age_group] || 0
      }));
    }

    const response = await fetch(`${API_BASE}/api/curriculum`);
    return handleResponse<AgeGroupConfig[]>(response);
  },

  // Get curriculum for a specific age group
  getCurriculum: async (ageGroup: string): Promise<CurriculumResponse> => {
    if (isPocketBaseConfigured() && pocketbase) {
      let config: any = null;
      try {
        config = await pocketbase.collection('age_group_configs').getFirstListItem("age_group='" + ageGroup + "'");
      } catch (e: any) {
        if (e.status !== 404) throw e;
      }

      if (!config) throw new Error('Age group config not found');

      let lessons: any[] = [];
      try {
        const result = await pocketbase.collection('lessons').getList(1, 500, {
          filter: "age_group='" + ageGroup + "'",
          sort: '+order_index',
          expand: 'lesson_objectives',
        });
        lessons = result.items;
      } catch (e: any) {
        if (e.status !== 404) throw e;
      }

      return {
        ageGroup,
        config: {
          ageGroup: config.age_group,
          availableBlocks: config.available_blocks || [],
          disabledBlocks: config.disabled_blocks || [],
          showCodePreview: config.show_code_preview ?? true,
          maxLoopDepth: config.max_loop_depth ?? 3,
          blockLabelsVi: config.block_labels_vi || {},
          blockLabelsEn: config.block_labels_en || {},
          totalLessons: lessons?.length || 0
        },
        lessons: (lessons || []).map((l: any) => ({
          id: l.id,
          slug: l.slug,
          title: l.title_vi,
          titleVi: l.title_vi,
          titleEn: l.title_en,
          descriptionVi: l.description_vi,
          descriptionEn: l.description_en,
          ageGroup: l.age_group,
          category: l.category,
          difficulty: l.difficulty,
          estimatedMinutes: l.estimated_minutes,
          orderIndex: l.order_index,
          nextLessonSlug: l.next_lesson_slug,
          previousLessonSlug: l.previous_lesson_slug,
          tags: l.tags || [],
          objectives: (l.expand?.lesson_objectives as any[])?.map((o: any) => ({
            id: o.id,
            textVi: o.objective_text_vi,
            textEn: o.objective_text_en
          })) || [],
          steps: [] as any[]
        }))
      };
    }

    const response = await fetch(`${API_BASE}/api/curriculum/${ageGroup}`);
    return handleResponse<CurriculumResponse>(response);
  },

  // Get a specific lesson by slug or UUID
  getLesson: async (idOrSlug: string, token?: string): Promise<Lesson> => {
    if (isPocketBaseConfigured() && pocketbase) {
      const isUUID = idOrSlug.includes('-') && idOrSlug.length === 36;

      let filter = isUUID ? "id='" + idOrSlug + "'" : "slug='" + idOrSlug + "'";

      let lesson: any = null;
      try {
        const result = await pocketbase.collection('lessons').getList(1, 1, {
          filter,
          expand: 'lesson_objectives,lesson_steps',
        });
        lesson = result.items[0] || null;
      } catch (e: any) {
        if (e.status !== 404) throw e;
      }

      if (!lesson) {
        throw new Error('Lesson not found');
      }

      // Get user progress if authenticated
      let userProgress = null;
      if (token) {
        const user = pocketbase.authStore.model;
        if (user) {
          try {
            const result = await pocketbase.collection('lesson_progress').getList(1, 1, {
              filter: "lesson_id='" + lesson.id + "' && user_id='" + user.id + "'",
            });
            userProgress = result.items[0] || null;
          } catch (e: any) {
            if (e.status !== 404) console.warn('Failed to fetch progress:', e);
          }
        }
      }

      return {
        id: lesson.id,
        slug: lesson.slug,
        title: lesson.title_vi,
        titleVi: lesson.title_vi,
        titleEn: lesson.title_en,
        descriptionVi: lesson.description_vi,
        descriptionEn: lesson.description_en,
        ageGroup: lesson.age_group,
        category: lesson.category,
        difficulty: lesson.difficulty,
        estimatedMinutes: lesson.estimated_minutes,
        orderIndex: lesson.order_index,
        nextLessonSlug: lesson.next_lesson_slug,
        previousLessonSlug: lesson.previous_lesson_slug,
        tags: lesson.tags || [],
        objectives: (lesson.expand?.lesson_objectives as any[])?.map((o: any) => ({
          id: o.id,
          textVi: o.objective_text_vi,
          textEn: o.objective_text_en
        })) || [],
        steps: (lesson.expand?.lesson_steps || [])
          .sort((a: any, b: any) => a.step_order - b.step_order)
          .map((s: any) => ({
            id: s.id,
            stepKey: s.step_key,
            stepOrder: s.step_order,
            title: s.title_vi || s.title,
            titleVi: s.title_vi,
            titleEn: s.title_en,
            descriptionVi: s.description_vi,
            descriptionEn: s.description_en,
            allowedBlocks: s.allowed_blocks || [],
            suggestedBlocks: s.suggested_blocks || [],
            blockedBlocks: s.blocked_blocks || [],
            hintVi: s.hint_vi,
            hintEn: s.hint_en,
            expectedOutput: s.expected_output
          })),
        userProgress: userProgress ? {
          completed: userProgress.completed,
          completedAt: userProgress.completed_at,
          completedSteps: userProgress.completed_steps || [],
          timeSpentSeconds: userProgress.time_spent_seconds || 0,
          lastWorkspaceXml: userProgress.last_workspace_xml,
          studentRating: userProgress.student_rating
        } : null
      };
    }

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${API_BASE}/api/curriculum/lessons/${idOrSlug}`, { headers });
    return handleResponse<Lesson>(response);
  },

  // Save lesson progress
  saveProgress: async (
    idOrSlug: string,
    progress: {
      workspaceXml?: string;
      completedSteps?: string[];
      timeSpentSeconds?: number;
      rating?: number;
    },
    token: string
  ): Promise<{ success: boolean; progress: any }> => {
    if (isPocketBaseConfigured() && pocketbase) {
      const isUUID = idOrSlug.includes('-') && idOrSlug.length === 36;
      const filter = isUUID ? "id='" + idOrSlug + "'" : "slug='" + idOrSlug + "'";

      let lesson: any = null;
      try {
        const result = await pocketbase.collection('lessons').getList(1, 1, { filter });
        lesson = result.items[0];
      } catch (e: any) {
        if (e.status !== 404) throw e;
      }

      if (!lesson) {
        throw new Error('Lesson not found');
      }

      const user = pocketbase.authStore.model;
      if (!user) {
        throw new Error('Authentication required');
      }

      const progressData: any = {
        user_id: user.id,
        lesson_id: lesson.id,
        last_workspace_xml: progress.workspaceXml || null,
        completed_steps: progress.completedSteps || [],
        time_spent_seconds: progress.timeSpentSeconds || 0
      };

      if (progress.rating !== undefined) {
        progressData.student_rating = progress.rating;
      }

      let result: any = null;
      try {
        result = await pocketbase.collection('lesson_progress').create(progressData);
      } catch (e: any) {
        if (e.status !== 404) throw e;
      }

      if (!result) {
        throw new Error('Failed to save progress');
      }

      return {
        success: true,
        progress: {
          completed: result.completed,
          completedSteps: result.completed_steps,
          timeSpentSeconds: result.time_spent_seconds,
          studentRating: result.student_rating
        }
      };
    }

    const response = await fetch(`${API_BASE}/api/curriculum/lessons/${idOrSlug}/progress`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(progress)
    });
    return handleResponse(response);
  },

  // Educator CRUD operations
  createLesson: async (lessonData: Partial<Lesson> & { ageGroup: string; orderIndex: number }): Promise<Lesson> => {
    if (isPocketBaseConfigured() && pocketbase) {
      let newLesson: any = null;
      try {
        newLesson = await pocketbase.collection('lessons').create({
          title_vi: lessonData.titleVi,
          title_en: lessonData.titleEn,
          description_vi: lessonData.descriptionVi,
          description_en: lessonData.descriptionEn,
          age_group: lessonData.ageGroup,
          category: lessonData.category,
          difficulty: lessonData.difficulty,
          estimated_minutes: lessonData.estimatedMinutes,
          order_index: lessonData.orderIndex,
          slug: lessonData.slug || lessonData.titleVi?.toLowerCase().replace(/\s+/g, '-') || '',
          tags: lessonData.tags || [],
        });
      } catch (e: any) {
        if (e.status !== 404) throw e;
      }

      if (!newLesson) {
        const response = await fetch(`${API_BASE}/api/lessons`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(lessonData),
        });
        return handleResponse<Lesson>(response);
      }

      return newLesson as unknown as Lesson;
    }

    const response = await fetch(`${API_BASE}/api/lessons`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(lessonData),
    });
    return handleResponse<Lesson>(response);
  },

  updateLesson: async (id: string, lessonData: Partial<Lesson>): Promise<Lesson> => {
    if (isPocketBaseConfigured() && pocketbase) {
      let updatedLesson: any = null;
      try {
        updatedLesson = await pocketbase.collection('lessons').update(id, {
          title_vi: lessonData.titleVi,
          title_en: lessonData.titleEn,
          description_vi: lessonData.descriptionVi,
          description_en: lessonData.descriptionEn,
          category: lessonData.category,
          difficulty: lessonData.difficulty,
          estimated_minutes: lessonData.estimatedMinutes,
          tags: lessonData.tags,
        });
      } catch (e: any) {
        if (e.status !== 404) throw e;
      }

      if (!updatedLesson) {
        const response = await fetch(`${API_BASE}/api/lessons/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(lessonData),
        });
        return handleResponse<Lesson>(response);
      }

      return updatedLesson as unknown as Lesson;
    }

    const response = await fetch(`${API_BASE}/api/lessons/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(lessonData),
    });
    return handleResponse<Lesson>(response);
  },

  deleteLesson: async (id: string): Promise<void> => {
    if (isPocketBaseConfigured() && pocketbase) {
      try {
        await pocketbase.collection('lessons').delete(id);
      } catch (e: any) {
        if (e.status !== 404) throw e;
      }
      return;
    }

    const response = await fetch(`${API_BASE}/api/lessons/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Delete failed');
  },

  updateLessonOrder: async (lessonOrders: { id: string; orderIndex: number }[]): Promise<void> => {
    if (isPocketBaseConfigured() && pocketbase) {
      try {
        await Promise.all(lessonOrders.map(({ id, orderIndex }) =>
          pocketbase.collection('lessons').update(id, { order_index: orderIndex })
        ));
      } catch (e: any) {
        console.warn('Failed to update lesson order in PocketBase:', e);
      }
      return;
    }

    const response = await fetch(`${API_BASE}/api/lessons/reorder`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lessons: lessonOrders }),
    });
    if (!response.ok) throw new Error('Reorder failed');
  },

  // Mark lesson as complete
  completeLesson: async (idOrSlug: string, token: string): Promise<{ success: boolean; completed: boolean; completedAt: string }> => {
    if (isPocketBaseConfigured() && pocketbase) {
      const isUUID = idOrSlug.includes('-') && idOrSlug.length === 36;
      const filter = isUUID ? "id='" + idOrSlug + "'" : "slug='" + idOrSlug + "'";

      let lesson: any = null;
      try {
        const result = await pocketbase.collection('lessons').getList(1, 1, { filter });
        lesson = result.items[0];
      } catch (e: any) {
        if (e.status !== 404) throw e;
      }

      if (!lesson) {
        throw new Error('Lesson not found');
      }

      const user = pocketbase.authStore.model;
      if (!user) {
        throw new Error('Authentication required');
      }

      let result: any = null;
      try {
        result = await pocketbase.collection('lesson_progress').create({
          user_id: user.id,
          lesson_id: lesson.id,
          completed: true,
          completed_at: new Date().toISOString()
        });
      } catch (e: any) {
        if (e.status !== 404) throw e;
      }

      if (!result) {
        throw new Error('Failed to complete lesson');
      }

      return {
        success: true,
        completed: true,
        completedAt: result.completed_at
      };
    }

    const response = await fetch(`${API_BASE}/api/curriculum/lessons/${idOrSlug}/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    return handleResponse(response);
  }
};

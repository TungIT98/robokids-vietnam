import { pocketbase, isPocketBaseConfigured } from './pocketbase';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3100';

export interface MissionTemplate {
  id: string;
  slug: string;
  type: 'daily' | 'weekly' | 'challenge' | 'journey' | 'achievement';
  title: string;
  titleVi: string;
  titleEn: string;
  descriptionVi: string;
  descriptionEn: string;
  requiredLessons: string[];
  requiredLessonCount: number;
  requiredXp: number;
  requiredStreakDays: number;
  xpReward: number;
  badgeReward: string | null;
  iconEmoji: string;
  colorHex: string;
  ageGroupFilter: string[];
  isActive: boolean;
}

export interface UserMissionProgress {
  status: 'active' | 'completed' | 'expired' | 'cancelled';
  progressPercent: number;
  lessonsCompleted: string[];
  xpEarned: number;
  startedAt: string;
  completedAt: string | null;
}

export interface DailyMission extends MissionTemplate {
  userProgress: UserMissionProgress | null;
}

export interface UserActiveMission {
  id: string;
  templateId: string;
  template: Pick<MissionTemplate, 'slug' | 'type' | 'title' | 'titleVi' | 'descriptionVi' | 'xpReward' | 'badgeReward' | 'iconEmoji' | 'colorHex'> | null;
  status: string;
  progressPercent: number;
  lessonsCompleted: string[];
  xpEarned: number;
  startedAt: string;
  expiresAt: string | null;
}

export interface SubmitResult {
  success: boolean;
  mission: {
    id: string;
    slug: string;
    title: string;
    status: string;
    completedAt: string;
    xpEarned: number;
    badgeEarned: string | null;
  };
}

async function handleResponse<T>(response: Response): Promise<T> {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'An error occurred');
  }
  return data;
}

export const missionsApi = {
  // List available mission templates (public)
  getMissions: async (params?: { age_group?: string; mission_type?: string }): Promise<MissionTemplate[]> => {
    if (isPocketBaseConfigured() && pocketbase) {
      let filter = "is_active=true";
      if (params?.mission_type) {
        filter += " && mission_type='" + params.mission_type + "'";
      }

      let missions: any[] = [];
      try {
        const result = await pocketbase.collection('mission_templates').getList(1, 500, {
          filter,
        });
        missions = result.items;
      } catch (e: any) {
        if (e.status !== 404) throw e;
      }

      // Filter by age_group if provided (PocketBase doesn't have contains for arrays)
      if (params?.age_group) {
        missions = missions.filter((m: any) =>
          m.age_group_filter && m.age_group_filter.includes(params.age_group)
        );
      }

      return missions.map((m: any) => ({
        id: m.id,
        slug: m.slug,
        type: m.mission_type,
        title: m.title_vi,
        titleVi: m.title_vi,
        titleEn: m.title_en,
        descriptionVi: m.description_vi,
        descriptionEn: m.description_en,
        requiredLessons: m.required_lessons || [],
        requiredLessonCount: m.required_lesson_count,
        requiredXp: m.required_xp,
        requiredStreakDays: m.required_streak_days,
        xpReward: m.xp_reward,
        badgeReward: m.badge_reward,
        iconEmoji: m.icon_emoji,
        colorHex: m.color_hex,
        ageGroupFilter: m.age_group_filter || [],
        isActive: m.is_active
      }));
    }

    const searchParams = new URLSearchParams();
    if (params?.age_group) searchParams.set('age_group', params.age_group);
    if (params?.mission_type) searchParams.set('mission_type', params.mission_type);

    const url = `${API_BASE}/api/missions${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
    return handleResponse<MissionTemplate[]>(await fetch(url));
  },

  // Get today's daily missions for authenticated user
  getDailyMissions: async (token: string): Promise<DailyMission[]> => {
    if (isPocketBaseConfigured() && pocketbase) {
      let templates: any[] = [];
      try {
        const result = await pocketbase.collection('mission_templates').getList(1, 100, {
          filter: "mission_type='daily' && is_active=true",
        });
        templates = result.items;
      } catch (e: any) {
        if (e.status !== 404) throw e;
      }

      const userId = pocketbase.authStore.model?.id;
      let userMissions: any[] = [];
      if (userId && templates.length > 0) {
        const templateIds = templates.map((t: any) => t.id);
        try {
          const result = await pocketbase.collection('user_missions').getList(1, 100, {
            filter: "user_id='" + userId + "' && status='active'",
          });
          userMissions = result.items.filter((um: any) => templateIds.includes(um.mission_template_id));
        } catch (e: any) {
          if (e.status !== 404) throw e;
        }
      }

      const today = new Date().toISOString().split('T')[0];

      return templates.map((t: any) => {
        const userMission = userMissions.find(
          (um: any) => um.mission_template_id === t.id && um.started_at >= today
        );
        return {
          id: t.id,
          slug: t.slug,
          type: t.mission_type,
          title: t.title_vi,
          titleVi: t.title_vi,
          titleEn: t.title_en,
          descriptionVi: t.description_vi,
          descriptionEn: t.description_en,
          requiredLessonCount: t.required_lesson_count,
          requiredLessons: [],
          requiredXp: 0,
          requiredStreakDays: 0,
          ageGroupFilter: [],
          isActive: true,
          xpReward: t.xp_reward,
          badgeReward: t.badge_reward,
          iconEmoji: t.icon_emoji,
          colorHex: t.color_hex,
          userProgress: userMission ? {
            status: userMission.status,
            progressPercent: userMission.progress_percent,
            lessonsCompleted: userMission.lessons_completed || [],
            xpEarned: userMission.xp_earned,
            startedAt: userMission.started_at,
            completedAt: userMission.completed_at
          } : null
        };
      });
    }

    const response = await fetch(`${API_BASE}/api/missions/daily`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return handleResponse<DailyMission[]>(response);
  },

  // Get specific mission template
  getMission: async (id: string, token?: string): Promise<MissionTemplate> => {
    if (isPocketBaseConfigured() && pocketbase) {
      const isUUID = id.includes('-') && id.length === 36;
      let filter = "is_active=true";
      if (isUUID) {
        filter += " && id='" + id + "'";
      } else {
        filter += " && slug='" + id + "'";
      }

      let template: any = null;
      try {
        template = await pocketbase.collection('mission_templates').getFirstListItem(filter);
      } catch (e: any) {
        if (e.status !== 404) throw e;
      }

      if (!template) throw new Error('Mission not found');

      return {
        id: template.id,
        slug: template.slug,
        type: template.mission_type,
        title: template.title_vi,
        titleVi: template.title_vi,
        titleEn: template.title_en,
        descriptionVi: template.description_vi,
        descriptionEn: template.description_en,
        requiredLessons: template.required_lessons || [],
        requiredLessonCount: template.required_lesson_count,
        requiredXp: template.required_xp,
        requiredStreakDays: template.required_streak_days,
        xpReward: template.xp_reward,
        badgeReward: template.badge_reward,
        iconEmoji: template.icon_emoji,
        colorHex: template.color_hex,
        ageGroupFilter: template.age_group_filter || [],
        isActive: template.is_active
      };
    }

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${API_BASE}/api/missions/${id}`, { headers });
    return handleResponse<MissionTemplate>(response);
  },

  // Submit/complete a mission
  submitMission: async (id: string, token: string): Promise<SubmitResult> => {
    if (isPocketBaseConfigured() && pocketbase) {
      const isUUID = id.includes('-') && id.length === 36;
      let filter = "is_active=true";
      if (isUUID) {
        filter += " && id='" + id + "'";
      } else {
        filter += " && slug='" + id + "'";
      }

      let template: any = null;
      try {
        template = await pocketbase.collection('mission_templates').getFirstListItem(filter);
      } catch (e: any) {
        if (e.status !== 404) throw e;
      }

      if (!template) throw new Error('Mission not found');

      const userId = pocketbase.authStore.model?.id;
      if (!userId) throw new Error('Authentication required');

      // Get or create user mission
      let userMission: any = null;
      try {
        userMission = await pocketbase.collection('user_missions').getFirstListItem(
          "user_id='" + userId + "' && mission_template_id='" + template.id + "' && status='active'"
        );
      } catch (e: any) {
        if (e.status !== 404) throw e;
      }

      if (!userMission) {
        try {
          userMission = await pocketbase.collection('user_missions').create({
            user_id: userId,
            mission_template_id: template.id,
            expires_at: template.mission_type === 'daily'
              ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
              : null
          });
        } catch (e: any) {
          throw e;
        }
      }

      // Mark complete
      let updatedMission: any = null;
      try {
        updatedMission = await pocketbase.collection('user_missions').update(userMission.id, {
          status: 'completed',
          completed_at: new Date().toISOString(),
          progress_percent: 100,
          xp_earned: template.xp_reward
        });
      } catch (e: any) {
        throw e;
      }

      // Award XP
      if (template.xp_reward > 0) {
        try {
          const currentProgress = await pocketbase.collection('user_progress').getFirstListItem("user_id='" + userId + "'");
          await pocketbase.collection('user_progress').update(userId, {
            total_xp: (currentProgress?.total_xp || 0) + template.xp_reward
          });
        } catch (e: any) {
          // Ignore if user_progress doesn't exist
          if (e.status !== 404) console.warn('Failed to update XP:', e);
        }
      }

      return {
        success: true,
        mission: {
          id: template.id,
          slug: template.slug,
          title: template.title_vi,
          status: 'completed',
          completedAt: updatedMission.completed_at,
          xpEarned: template.xp_reward,
          badgeEarned: template.badge_reward
        }
      };
    }

    const response = await fetch(`${API_BASE}/api/missions/${id}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    return handleResponse<SubmitResult>(response);
  },

  // Get user's active missions
  getUserActiveMissions: async (token: string): Promise<UserActiveMission[]> => {
    if (isPocketBaseConfigured() && pocketbase) {
      const userId = pocketbase.authStore.model?.id;
      if (!userId) return [];

      let missions: any[] = [];
      try {
        const result = await pocketbase.collection('user_missions').getList(1, 100, {
          filter: "user_id='" + userId + "' && status='active'",
          expand: 'mission_templates',
        });
        missions = result.items;
      } catch (e: any) {
        if (e.status !== 404) throw e;
      }

      return missions.map((um: any) => ({
        id: um.id,
        templateId: um.mission_template_id,
        template: um.expand?.mission_templates ? {
          slug: um.expand.mission_templates.slug,
          type: um.expand.mission_templates.mission_type,
          title: um.expand.mission_templates.title_vi,
          titleVi: um.expand.mission_templates.title_vi,
          descriptionVi: um.expand.mission_templates.description_vi,
          xpReward: um.expand.mission_templates.xp_reward,
          badgeReward: um.expand.mission_templates.badge_reward,
          iconEmoji: um.expand.mission_templates.icon_emoji,
          colorHex: um.expand.mission_templates.color_hex
        } : null,
        status: um.status,
        progressPercent: um.progress_percent,
        lessonsCompleted: um.lessons_completed || [],
        xpEarned: um.xp_earned,
        startedAt: um.started_at,
        expiresAt: um.expires_at
      }));
    }

    const response = await fetch(`${API_BASE}/api/missions/user/active`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return handleResponse<UserActiveMission[]>(response);
  }
};

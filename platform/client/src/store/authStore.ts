import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { pocketbase, isPocketBaseConfigured } from '../services/pocketbase';

interface User {
  id: string;
  email: string;
  role?: string;
  full_name?: string;
  avatar_url?: string;
  date_of_birth?: string;
  grade_level?: number;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  isHydrated: boolean;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  signup: (data: {
    email: string;
    password: string;
    full_name: string;
    role: 'parent' | 'student';
    date_of_birth?: string;
    grade_level?: number;
  }) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  setHydrated: (value: boolean) => void;
}

// Helper to convert PocketBase model to User interface
function pbModelToUser(model: any): User {
  return {
    id: model.id,
    email: model.email,
    role: model.role,
    full_name: model.full_name,
    avatar_url: model.avatar_url,
    date_of_birth: model.date_of_birth,
    grade_level: model.grade_level,
  };
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isLoading: false,
      error: null,
      isHydrated: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          if (!isPocketBaseConfigured()) {
            throw new Error('PocketBase not configured. Please contact support.');
          }
          const authData = await pocketbase
            .collection('users')
            .authWithPassword(email, password);
          set({
            user: pbModelToUser(authData.record),
            token: pocketbase.authStore.token,
            isLoading: false,
          });
        } catch (err: any) {
          set({ error: err.message || 'Đăng nhập thất bại', isLoading: false });
          throw err;
        }
      },

      signup: async (data) => {
        set({ isLoading: true, error: null });
        try {
          if (!isPocketBaseConfigured()) {
            throw new Error('PocketBase not configured. Please contact support.');
          }
          await pocketbase.collection('users').create({
            email: data.email,
            password: data.password,
            passwordConfirm: data.password,
            full_name: data.full_name,
            role: data.role,
            date_of_birth: data.date_of_birth || null,
            grade_level: data.grade_level || null,
          });
          // Auto-login after registration
          const authData = await pocketbase
            .collection('users')
            .authWithPassword(data.email, data.password);
          set({
            user: pbModelToUser(authData.record),
            token: pocketbase.authStore.token,
            isLoading: false,
          });
        } catch (err: any) {
          set({ error: err.message || 'Đăng ký thất bại', isLoading: false });
          throw err;
        }
      },

      logout: async () => {
        pocketbase.authStore.clear();
        set({ user: null, token: null, error: null });
      },

      clearError: () => set({ error: null }),

      setHydrated: (value: boolean) => set({ isHydrated: value }),
    }),
    {
      name: 'robokids-auth',
      partialize: (state) => ({
        user: state.user,
      }),
      onRehydrateStorage: () => (state, store: any) => {
        store?.set({ isHydrated: true } as Partial<AuthState>);
        // PocketBase handles token persistence via authStore
        // Sync user from PocketBase authStore on rehydration
        if (pocketbase.authStore.isValid) {
          store?.set({ user: pbModelToUser(pocketbase.authStore.model), token: pocketbase.authStore.token } as Partial<AuthState>);
        }
      },
    }
  )
);

// Selectors
export const selectUser = (state: AuthState) => state.user;
export const selectToken = (state: AuthState) => state.token;
export const selectIsAuthenticated = (state: AuthState) => !!state.token;
export const selectIsLoading = (state: AuthState) => state.isLoading;
export const selectError = (state: AuthState) => state.error;

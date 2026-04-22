import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { pocketbase, isPocketBaseConfigured } from '../services/pocketbase';

export type UserRole = 'student' | 'parent' | 'admin' | 'school_admin' | 'teacher' | 'robokids_staff';

interface User {
  id: string;
  email: string;
  role?: UserRole;
  full_name?: string;
  date_of_birth?: string;
  grade_level?: number;
  school_id?: string; // For school_admin and teacher roles
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  userAge: number | null;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithFacebook: () => Promise<void>;
  signup: (data: {
    email: string;
    password: string;
    full_name: string;
    role: 'parent' | 'student';
    date_of_birth?: string;
    grade_level?: number;
  }) => Promise<void>;
  logout: () => Promise<void>;
  error: string | null;
  clearError: () => void;
  hasRole: (...roles: UserRole[]) => boolean;
  userRole: UserRole | null;
}

function computeAge(dateOfBirth: string | undefined): number | null {
  if (!dateOfBirth) return null;
  try {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age >= 0 ? age : null;
  } catch {
    return null;
  }
}

function pbModelToUser(model: any): User {
  return {
    id: model.id,
    email: model.email,
    role: model.role,
    full_name: model.full_name,
    date_of_birth: model.date_of_birth,
    grade_level: model.grade_level,
    school_id: model.school_id,
  };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sync with PocketBase authStore on mount
  useEffect(() => {
    // Set initial loading state based on existing auth
    if (pocketbase.authStore.isValid) {
      setUser(pbModelToUser(pocketbase.authStore.model));
      setToken(pocketbase.authStore.token);
    }
    // Auth sync is complete
    setIsLoading(false);
  }, []);

  // Listen to PocketBase auth store changes
  useEffect(() => {
    const unsub = pocketbase.authStore.onChange((token, model) => {
      if (token && model) {
        setUser(pbModelToUser(model));
        setToken(token);
      } else {
        setUser(null);
        setToken(null);
      }
    });
    return unsub;
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      if (!isPocketBaseConfigured()) {
        throw new Error('PocketBase chưa được cấu hình. Vui lòng liên hệ support.');
      }
      await pocketbase.collection('users').authWithPassword(email, password);
    } catch (err: any) {
      setError(err.message || 'Đăng nhập thất bại');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (data: {
    email: string;
    password: string;
    full_name: string;
    role: 'parent' | 'student';
    date_of_birth?: string;
    grade_level?: number;
  }) => {
    setIsLoading(true);
    setError(null);
    try {
      if (!isPocketBaseConfigured()) {
        throw new Error('PocketBase chưa được cấu hình. Vui lòng liên hệ support.');
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
      await pocketbase.collection('users').authWithPassword(data.email, data.password);
      // Force sync state after auto-login (PocketBase authStore updated but React state may lag)
      if (pocketbase.authStore.isValid) {
        setUser(pbModelToUser(pocketbase.authStore.model));
        setToken(pocketbase.authStore.token);
      }
    } catch (err: any) {
      setError(err.message || 'Đăng ký thất bại');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    pocketbase.authStore.clear();
    setUser(null);
    setToken(null);
  };

  const loginWithGoogle = async () => {
    if (!isPocketBaseConfigured()) {
      throw new Error('PocketBase chưa được cấu hình');
    }
    setIsLoading(true);
    setError(null);
    try {
      await pocketbase.collection('users').authWithOAuth2({
        provider: 'google',
      });
    } catch (err: any) {
      setError(err.message || 'Đăng nhập Google thất bại');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithFacebook = async () => {
    if (!isPocketBaseConfigured()) {
      throw new Error('PocketBase chưa được cấu hình');
    }
    setIsLoading(true);
    setError(null);
    try {
      await pocketbase.collection('users').authWithOAuth2({
        provider: 'facebook',
      });
    } catch (err: any) {
      setError(err.message || 'Đăng nhập Facebook thất bại');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = () => setError(null);

  const userRole: UserRole | null = (user?.role as UserRole) || null;

  const hasRole = (...roles: UserRole[]): boolean => {
    if (!userRole) return false;
    return roles.includes(userRole);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, userAge: computeAge(user?.date_of_birth), login, loginWithGoogle, loginWithFacebook, signup, logout, error, clearError, hasRole, userRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

export default AuthContext;

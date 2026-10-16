import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { AuthContext } from './context';
import { clearStoredSession, readStoredUser, storeSession, type AuthUser, type UserProfile } from './session';
import { useAuth } from './useAuth';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(readStoredUser);

  useEffect(() => {
    const handleExpiredSession = () => {
      clearStoredSession();
      setUser(null);
    };

    window.addEventListener('auth-session-expired', handleExpiredSession);
    return () => window.removeEventListener('auth-session-expired', handleExpiredSession);
  }, []);

  const value = useMemo(() => ({
    user,
    login: (token: string, nextUser: AuthUser) => {
      storeSession(token, nextUser);
      setUser(nextUser);
    },
    logout: () => {
      clearStoredSession();
      setUser(null);
    },
  }), [user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function RequireAuth() {
  const { user } = useAuth();
  const location = useLocation();
  return user ? <Outlet /> : <Navigate to="/login" replace state={{ from: location }} />;
}

export function RequireProfile({
  allowedProfiles,
  children,
}: {
  allowedProfiles: UserProfile[];
  children: ReactNode;
}) {
  const { user } = useAuth();
  return user && allowedProfiles.includes(user.perfil)
    ? <>{children}</>
    : <Navigate to="/" replace />;
}

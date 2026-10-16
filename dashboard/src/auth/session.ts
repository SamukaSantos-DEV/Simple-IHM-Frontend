export type UserProfile = 'ADMIN' | 'OPERADOR' | 'MANUTENCAO';

export interface AuthUser {
  id: number;
  nome: string;
  email: string;
  perfil: UserProfile;
}

const TOKEN_KEY = 'platform_auth_token';
const USER_KEY = 'platform_auth_user';

export function isUserProfile(value: unknown): value is UserProfile {
  return value === 'ADMIN' || value === 'OPERADOR' || value === 'MANUTENCAO';
}

export function readStoredUser(): AuthUser | null {
  const token = sessionStorage.getItem(TOKEN_KEY);
  const rawUser = sessionStorage.getItem(USER_KEY);
  if (!token || !rawUser) return null;

  try {
    const user: unknown = JSON.parse(rawUser);
    if (
      typeof user === 'object' &&
      user !== null &&
      'id' in user &&
      typeof user.id === 'number' &&
      'nome' in user &&
      typeof user.nome === 'string' &&
      'email' in user &&
      typeof user.email === 'string' &&
      'perfil' in user &&
      isUserProfile(user.perfil)
    ) {
      return {
        id: user.id,
        nome: user.nome,
        email: user.email,
        perfil: user.perfil,
      };
    }
  } catch (error) {
    console.error('Não foi possível recuperar a sessão armazenada:', error);
  }

  clearStoredSession();
  return null;
}

export function getAuthToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function storeSession(token: string, user: AuthUser) {
  sessionStorage.setItem(TOKEN_KEY, token);
  sessionStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearStoredSession() {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
}

export function isMaintenanceEditor(profile: UserProfile | undefined): boolean {
  return profile === 'ADMIN' || profile === 'MANUTENCAO';
}

import { API_BASE_URL } from './config';
import { clearStoredSession, getAuthToken } from './auth/session';

export async function apiFetch(path: string, init: RequestInit = {}) {
  const token = getAuthToken();
  if (!token) {
    window.dispatchEvent(new Event('auth-session-expired'));
    throw new Error('Sua sessão expirou. Entre novamente para continuar.');
  }

  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);
  headers.set('ngrok-skip-browser-warning', 'true');
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');

  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  if (response.status === 401) {
    clearStoredSession();
    window.dispatchEvent(new Event('auth-session-expired'));
  }
  return response;
}

export async function apiErrorMessage(response: Response, fallback: string) {
  try {
    const body: unknown = await response.json();
    if (typeof body === 'object' && body !== null) {
      if ('detail' in body && typeof body.detail === 'string') return body.detail;
      if ('mensagem' in body && typeof body.mensagem === 'string') return body.mensagem;
    }
  } catch (error) {
    console.error('Não foi possível interpretar o erro retornado pela API:', error);
  }
  return fallback;
}

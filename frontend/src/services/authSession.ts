const CLEARED_KEY = 'plantim-auth-cleared';

export function isAuthCleared(): boolean {
  try {
    return sessionStorage.getItem(CLEARED_KEY) === '1';
  } catch {
    return false;
  }
}

export function markAuthCleared(): void {
  try {
    sessionStorage.setItem(CLEARED_KEY, '1');
  } catch {
    // sessionStorage can be blocked; local cleanup below still runs
  }
  localStorage.removeItem('token');
  localStorage.removeItem('auth-storage');
}

export function clearAuthClearedFlag(): void {
  try {
    sessionStorage.removeItem(CLEARED_KEY);
  } catch {
    // ignore
  }
}

export function readStoredToken(): string | null {
  if (isAuthCleared()) return null;

  const direct = localStorage.getItem('token');
  if (direct) return direct;

  try {
    const raw = localStorage.getItem('auth-storage');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.state?.token || null;
  } catch {
    return null;
  }
}

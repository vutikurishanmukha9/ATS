// ATS API Client

export interface ApiError {
  code: string;
  message: string;
  details?: any;
  request_id?: string;
  status: number;
}

// Global subscriber for server cold-start notice (> 3000ms delay)
type ColdStartListener = (isStarting: boolean) => void;
const coldStartListeners: Set<ColdStartListener> = new Set();

export function subscribeColdStart(listener: ColdStartListener): () => void {
  coldStartListeners.add(listener);
  return () => {
    coldStartListeners.delete(listener);
  };
}

function notifyColdStart(starting: boolean) {
  coldStartListeners.forEach((fn) => fn(starting));
}

let activeSlowRequestsCount = 0;

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
  retries = 1
): Promise<T> {
  const apiBase = (import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || '').replace(/\/$/, '');
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${apiBase}${cleanEndpoint}`;

  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  // 3-second cold start timer
  let timer: any = null;
  let markedSlow = false;
  timer = setTimeout(() => {
    markedSlow = true;
    activeSlowRequestsCount++;
    notifyColdStart(true);
  }, 3000);

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include', // Same-origin session cookie
    });

    clearTimeout(timer);
    if (markedSlow) {
      activeSlowRequestsCount = Math.max(0, activeSlowRequestsCount - 1);
      if (activeSlowRequestsCount === 0) {
        notifyColdStart(false);
      }
    }

    if (!response.ok) {
      // 401 Unauthorized redirect to login
      if (response.status === 401 && !window.location.pathname.startsWith('/login')) {
        window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
      }

      let errorData: any = null;
      try {
        errorData = await response.json();
      } catch {
        // Fallback for non-JSON response
      }

      const err: ApiError = {
        code: errorData?.error?.code || 'HTTP_ERROR',
        message: errorData?.error?.message || response.statusText || 'Request failed',
        details: errorData?.error?.details,
        request_id: errorData?.error?.request_id || response.headers.get('X-Request-ID') || undefined,
        status: response.status,
      };
      throw err;
    }

    // 204 No Content
    if (response.status === 204) {
      return null as unknown as T;
    }

    return (await response.json()) as T;
  } catch (error: any) {
    clearTimeout(timer);
    if (markedSlow) {
      activeSlowRequestsCount = Math.max(0, activeSlowRequestsCount - 1);
      if (activeSlowRequestsCount === 0) {
        notifyColdStart(false);
      }
    }

    // Retry once with backoff for network/cold-start failure
    if (retries > 0 && (!error.status || error.status >= 500)) {
      await new Promise((resolve) => setTimeout(resolve, 800));
      return apiFetch<T>(endpoint, options, retries - 1);
    }

    throw error;
  }
}

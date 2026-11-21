import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

function resolveBaseUrl(): string {
  const explicit = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, '');

  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location.hostname) {
    return `http://${window.location.hostname}:4000`;
  }

  const hostUri =
    Constants.expoConfig?.hostUri ??
    (Constants as unknown as { manifest2?: { extra?: { expoClient?: { hostUri?: string } } } })
      .manifest2?.extra?.expoClient?.hostUri;
  const host = hostUri?.split(':')[0];
  if (host && !['localhost', '127.0.0.1', '[::1]'].includes(host) && !host.endsWith('.exp.direct')) {
    return `http://${host}:4000`;
  }

  // Android emulators reach the host machine via 10.0.2.2; localhost is the emulator itself.
  if (Platform.OS === 'android') return 'http://10.0.2.2:4000';
  return 'http://localhost:4000';
}

export const API_URL = resolveBaseUrl();

// ngrok's free tier serves an HTML interstitial to browser-like GETs; this header bypasses it.
const NGROK_HEADER: Record<string, string> = /\.ngrok(-free)?\.(app|dev)/.test(API_URL)
  ? { 'ngrok-skip-browser-warning': 'true' }
  : {};

export const TOKEN_KEY = 'uniride.token';
export const USER_KEY = 'uniride.user';
export const UNIVERSITY_KEY = 'uniride.universityId';

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

export async function loadStoredToken(): Promise<string | null> {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  authToken = token;
  return token;
}

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(message: string, status = 500, code?: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

type ApiOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  auth?: boolean;
  signal?: AbortSignal;
};

export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const headers: Record<string, string> = { ...NGROK_HEADER };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (authToken && options.auth !== false) headers.Authorization = `Bearer ${authToken}`;

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: options.signal,
    });
  } catch {
    throw new ApiError(
      `We could not reach the server at ${API_URL}. Check your connection and try again.`,
      0,
      'NETWORK_ERROR',
    );
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(
      payload?.error?.message ?? 'Something went wrong. Please try again.',
      response.status,
      payload?.error?.code,
      payload?.error?.details,
    );
  }
  return payload?.data as T;
}

export async function apiUpload(
  uri: string,
  name = 'photo.jpg',
  mime = 'image/jpeg',
): Promise<{ url: string }> {
  const form = new FormData();
  if (Platform.OS === 'web') {
    const blob = await (await fetch(uri)).blob();
    form.append('file', blob, name);
  } else {
    form.append('file', { uri, name, type: mime } as unknown as Blob);
  }
  const response = await fetch(`${API_URL}/api/uploads`, {
    method: 'POST',
    headers: {
      ...NGROK_HEADER,
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    body: form,
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(
      payload?.error?.message ?? 'Upload failed',
      response.status,
      payload?.error?.code,
    );
  }
  return payload.data as { url: string };
}

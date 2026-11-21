import { API_URL } from './api';
import type { Role } from './types';

export function tzs(amount: number | string | null | undefined): string {
  const value = Number(amount ?? 0);
  return `TZS ${Math.round(value).toLocaleString('en-US')}`;
}

export function shortDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function dateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function timeAgo(value: string | null | undefined): string {
  if (!value) return '—';
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return shortDate(value);
}

export function distanceLabel(meters: number | null | undefined): string {
  if (meters === null || meters === undefined) return '—';
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export function mediaUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export const propertyTypeLabels: Record<string, string> = {
  HOSTEL: 'Hostel',
  HOUSE: 'House',
  APARTMENT: 'Apartment',
  ROOM: 'Single room',
};

export const rideStatusLabels: Record<string, string> = {
  REQUESTED: 'Searching for a driver',
  ACCEPTED: 'Driver accepted',
  DRIVER_EN_ROUTE: 'Driver on the way',
  ON_TRIP: 'On the trip',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export const driverStatusLabels: Record<string, string> = {
  IDLE: 'Online',
  ON_ROAD: 'On a ride',
  REQUESTED: 'Matching',
  OFFLINE: 'Offline',
};

export function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function roleHome(role: Role): string {
  if (role === 'DRIVER') return '/driver';
  if (role === 'OWNER') return '/owner';
  if (role === 'ADMIN') return '/admin';
  return '/student';
}

export function datePlus(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

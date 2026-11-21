import { API_URL } from './api';
import type { PropertyType, RideStatus } from './types';

export function tzs(value: number | string | null | undefined): string {
  const amount = Number(value ?? 0);
  return `TZS ${Math.round(amount).toLocaleString('en-US')}`;
}

export function shortDate(value: string | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function dateTime(value: string | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function timeAgo(value: string | null | undefined): string {
  if (!value) return '';
  const seconds = Math.max(1, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
  return shortDate(value);
}

export function distanceLabel(meters: number | null | undefined): string {
  if (meters === null || meters === undefined) return 'Distance on inquiry';
  if (meters < 1000) return `${Math.round(meters)} m from campus`;
  return `${(meters / 1000).toFixed(1)} km from campus`;
}

export function mediaUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (/^https?:\/\//.test(url)) return url;
  return `${API_URL}${url}`;
}

export const propertyTypeLabels: Record<PropertyType, string> = {
  HOSTEL: 'Hostel',
  HOUSE: 'Rental house',
  APARTMENT: 'Apartment',
  ROOM: 'Private room',
};

export const rideStatusLabels: Record<RideStatus, string> = {
  REQUESTED: 'Finding a driver',
  ACCEPTED: 'Driver accepted',
  DRIVER_EN_ROUTE: 'Driver en route',
  ON_TRIP: 'On trip',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export const rideStatusTones: Record<RideStatus, string> = {
  REQUESTED: 'warn',
  ACCEPTED: 'info',
  DRIVER_EN_ROUTE: 'info',
  ON_TRIP: 'info',
  COMPLETED: 'success',
  CANCELLED: 'danger',
};

export const driverStatusLabels: Record<string, string> = {
  IDLE: 'Available',
  ON_ROAD: 'On a trip',
  OFFLINE: 'Offline',
  REQUESTED: 'Requested',
};

export const verificationLabels: Record<string, string> = {
  PENDING: 'Under review',
  VERIFIED: 'Verified',
  REJECTED: 'Rejected',
};

export function initials(name: string | null | undefined): string {
  if (!name) return 'U';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export function roleHome(role: string): string {
  if (role === 'DRIVER') return '/driver';
  if (role === 'OWNER') return '/owner';
  if (role === 'ADMIN') return '/admin';
  return '/dashboard';
}

export function datePlus(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

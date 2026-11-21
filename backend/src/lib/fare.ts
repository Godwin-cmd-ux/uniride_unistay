import { config } from '../config';

export type FareBreakdown = {
  distanceM: number;
  distanceKm: number;
  baseFare: number;
  perKmFare: number;
  estimatedFare: number;
  commissionRate: number;
  commissionAmount: number;
  driverEarnings: number;
  currency: 'TZS';
};

const roundTo = (value: number, step: number) => Math.round(value / step) * step;

export function estimateFare(distanceM: number): FareBreakdown {
  const distanceKm = distanceM / 1000;
  const baseFare = config.fare.base;
  const perKmFare = distanceKm * config.fare.perKm;
  const raw = Math.max(config.fare.min, baseFare + perKmFare);
  const estimatedFare = roundTo(raw, config.fare.roundTo);
  const commissionAmount = roundTo(estimatedFare * config.commissionRate, 1);
  return {
    distanceM,
    distanceKm: Math.round(distanceKm * 100) / 100,
    baseFare,
    perKmFare: Math.round(perKmFare),
    estimatedFare,
    commissionRate: config.commissionRate,
    commissionAmount,
    driverEarnings: Math.round((estimatedFare - commissionAmount) * 100) / 100,
    currency: 'TZS',
  };
}

export function fareConfigSummary() {
  return {
    currency: 'TZS',
    baseFare: config.fare.base,
    perKm: config.fare.perKm,
    minimumFare: config.fare.min,
    commissionRate: config.commissionRate,
    accommodationSuccessFeeRate: config.accommodationSuccessFeeRate,
    note: 'Illustrative MVP fare model. Rates must be confirmed against the LATRA fare framework before public launch.',
  };
}

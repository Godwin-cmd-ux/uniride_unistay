/** Normalises Tanzanian phone numbers to +255XXXXXXXXX. */
export function normalizePhone(raw: string): string {
  const digits = String(raw ?? '').replace(/\D/g, '');
  let local = '';
  if (digits.startsWith('255') && digits.length === 12) {
    local = digits.slice(3);
  } else if (digits.startsWith('0') && digits.length === 10) {
    local = digits.slice(1);
  } else if (digits.length === 9) {
    local = digits;
  } else if (digits.startsWith('255') && digits.length > 12) {
    throw new Error('Invalid phone number');
  } else {
    throw new Error('Invalid phone number');
  }
  if (!/^[67]\d{8}$/.test(local)) {
    throw new Error('Enter a valid Tanzanian mobile number');
  }
  return `+255${local}`;
}

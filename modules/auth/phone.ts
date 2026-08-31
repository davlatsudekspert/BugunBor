const UZ_PHONE = /^998\d{9}$/;

export function normalizeUzbekPhone(input: string) {
  let digits = input.replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.length === 9) digits = `998${digits}`;
  if (digits.length === 12 && digits.startsWith('998') && UZ_PHONE.test(digits)) return `+${digits}`;
  throw new Error('INVALID_UZ_PHONE');
}

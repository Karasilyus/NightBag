export const PHONE_MAX_LENGTH = 11;

export const normalizePhoneInput = (value: string): string =>
  value.replace(/[^0-9]/g, '').slice(0, PHONE_MAX_LENGTH);

export const isValidOptionalPhone = (value: string): boolean =>
  value === '' || /^[0-9]{11}$/.test(value);

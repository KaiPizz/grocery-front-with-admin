const PHONE_FORMAT_CHARACTERS = /^\+?\d[\d\s().-]*\d$/;
const MIN_INTERNATIONAL_DIGITS = 7;
const MAX_INTERNATIONAL_DIGITS = 15;
const POLISH_COUNTRY_CODE = '48';
const POLISH_NATIONAL_DIGITS = 9;

function hasInternationalLength(digits: string): boolean {
  return digits.length >= MIN_INTERNATIONAL_DIGITS
    && digits.length <= MAX_INTERNATIONAL_DIGITS;
}

function hasValidPolishNationalDigits(digits: string): boolean {
  return digits.length === POLISH_NATIONAL_DIGITS && !digits.startsWith('0');
}

export function isValidPhoneNumber(input: string): boolean {
  const value = input.trim();
  if (!value || !PHONE_FORMAT_CHARACTERS.test(value)) return false;

  const plusCount = value.split('+').length - 1;
  if (plusCount > 1 || (plusCount === 1 && !value.startsWith('+'))) return false;

  const digits = value.replace(/\D/g, '');

  if (value.startsWith('+')) {
    if (digits.startsWith('0')) return false;
    if (digits.startsWith(POLISH_COUNTRY_CODE)) {
      return hasValidPolishNationalDigits(digits.slice(POLISH_COUNTRY_CODE.length));
    }
    return hasInternationalLength(digits);
  }

  if (digits.startsWith('00')) {
    const internationalDigits = digits.slice(2);
    if (internationalDigits.startsWith('0')) return false;
    if (internationalDigits.startsWith(POLISH_COUNTRY_CODE)) {
      return hasValidPolishNationalDigits(
        internationalDigits.slice(POLISH_COUNTRY_CODE.length),
      );
    }
    return hasInternationalLength(internationalDigits);
  }

  return hasValidPolishNationalDigits(digits)
    || (digits.startsWith(POLISH_COUNTRY_CODE)
      && hasValidPolishNationalDigits(digits.slice(POLISH_COUNTRY_CODE.length)));
}

export function isValidOptionalPhoneNumber(input: string): boolean {
  return input.trim() === '' || isValidPhoneNumber(input);
}

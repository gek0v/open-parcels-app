/**
 * Mathematical Checksum implementations as used in Open Parcels core:
 * - UPU S10 (Modulo 11 with weights 8, 6, 4, 2, 3, 5, 9, 7)
 * - UPS 1Z (Modulo 10 with alternating weights 1, 2)
 * - IATA Air Waybill (AWB Modulo 7)
 * - ISO 6346 Shipping Containers
 */

/**
 * UPU S10 Modulo 11 check digit verification
 * Format: 2 letters + 9 digits + 2 letters (e.g., RR123456785ES)
 */
export function verifyUpuS10(number: string): boolean {
  const clean = number.trim().toUpperCase();
  const upuRegex = /^[A-Z]{2}(\d{8})(\d)([A-Z]{2})$/;
  const match = clean.match(upuRegex);
  if (!match) return false;

  const digits = match[1];
  const expectedCheckDigit = parseInt(match[2], 10);
  const weights = [8, 6, 4, 2, 3, 5, 9, 7];

  let sum = 0;
  for (let i = 0; i < 8; i++) {
    sum += parseInt(digits[i], 10) * weights[i];
  }

  const remainder = sum % 11;
  let computed = 11 - remainder;
  if (computed === 10) computed = 0;
  if (computed === 11) computed = 5;

  return computed === expectedCheckDigit;
}

/**
 * UPS 1Z Modulo 10 verification
 * Format: 1Z + 6 alphanumeric (shipper account) + 2 alphanumeric (service) + 7 digits (package id) + 1 check digit
 */
export function verifyUps1Z(number: string): boolean {
  const clean = number.trim().toUpperCase();
  if (!clean.startsWith('1Z') || clean.length !== 18) return false;

  const payload = clean.slice(2, 17);
  const expectedCheck = parseInt(clean[17], 10);
  if (isNaN(expectedCheck)) return false;

  let total = 0;
  for (let i = 0; i < payload.length; i++) {
    const char = payload[i];
    let val = 0;
    if (char >= '0' && char <= '9') {
      val = parseInt(char, 10);
    } else if (char >= 'A' && char <= 'Z') {
      val = (char.charCodeAt(0) - 65 + 2) % 10;
    } else {
      return false;
    }

    if (i % 2 === 1) {
      val *= 2;
    }
    total += val;
  }

  const calcCheck = (10 - (total % 10)) % 10;
  return calcCheck === expectedCheck;
}

/**
 * IATA Air Waybill Modulo 7 verification
 * Format: 3 prefix digits + 8 digits (last is check digit = remainder of first 7 mod 7)
 */
export function verifyIataAwb(number: string): boolean {
  const clean = number.replace(/[\s-]/g, '');
  if (!/^\d{11}$/.test(clean)) return false;

  const first7 = parseInt(clean.slice(3, 10), 10);
  const expectedCheck = parseInt(clean[10], 10);

  return first7 % 7 === expectedCheck;
}

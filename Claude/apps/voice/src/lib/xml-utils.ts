export function escapeXml(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export const E164_REGEX = /^\+[1-9]\d{1,14}$/;

export function isValidPhone(phone: string): boolean {
  return E164_REGEX.test(phone);
}

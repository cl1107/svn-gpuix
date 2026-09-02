import { XMLParser } from 'fast-xml-parser';

export const svnXmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  trimValues: true,
});

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function asRecordArray(value: unknown): Record<string, unknown>[] {
  if (value === undefined || value === null) return [];
  if (Array.isArray(value)) return value.filter(isRecord);
  return isRecord(value) ? [value] : [];
}

export function readString(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return undefined;
}

export function readRevision(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0) return value;
  if (typeof value === 'string' && /^\d+$/.test(value)) return Number(value);
  return undefined;
}

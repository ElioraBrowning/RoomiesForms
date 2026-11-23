import cs401 from './schemas/CS401.json';
import cs402 from './schemas/CS402.json';
import cs403 from './schemas/CS403.json';
import cs404 from './schemas/CS404.json';
import cs405 from './schemas/CS405.json';
import cs410 from './schemas/CS410.json';
import cs420 from './schemas/CS420.json';
import exitSurvey from './schemas/ExitSurvey.json';
import type { FormSchema } from './types';

/** Official 7-form Computer Science Internship Packet sequence */
export const INTERNSHIP_PACKET_ORDER: Record<string, number> = {
  CS401: 1,
  CS402: 2,
  CS403: 3,
  CS404: 4,
  CS420: 5,
  CS410: 6,
  CS405: 7,
  EXITSURVEY: 99,
};

export function comparePacketOrder(aKey: string, bKey: string): number {
  const normA = aKey.replace(/\s+/g, '').toUpperCase();
  const normB = bKey.replace(/\s+/g, '').toUpperCase();
  const orderA = INTERNSHIP_PACKET_ORDER[normA] ?? 50;
  const orderB = INTERNSHIP_PACKET_ORDER[normB] ?? 50;
  if (orderA !== orderB) return orderA - orderB;
  return aKey.localeCompare(bKey);
}

export const STATIC_SCHEMAS: Record<string, FormSchema> = {
  CS401: cs401 as unknown as FormSchema,
  CS402: cs402 as unknown as FormSchema,
  CS403: cs403 as unknown as FormSchema,
  CS404: cs404 as unknown as FormSchema,
  CS420: cs420 as unknown as FormSchema,
  CS410: cs410 as unknown as FormSchema,
  CS405: cs405 as unknown as FormSchema,
  ExitSurvey: exitSurvey as unknown as FormSchema,
};

const NUMERIC_FORM_IDS: Record<string, string> = {
  '1': 'CS401',
  '2': 'CS402',
  '3': 'CS403',
  '4': 'CS404',
  '5': 'CS405',
  '6': 'CS410',
  '7': 'CS420',
  '8': 'ExitSurvey',
};

/**
 * Looks up a bundled canonical form schema by key (e.g. "CS401") or numeric ID ("1"–"8").
 */
export function getStaticSchema(keyOrId: string | number): FormSchema | null {
  const raw = String(keyOrId).trim();
  const mapped = NUMERIC_FORM_IDS[raw] || raw;
  const norm = mapped.toLowerCase();
  for (const [key, schema] of Object.entries(STATIC_SCHEMAS)) {
    if (key.toLowerCase() === norm || schema.id.toLowerCase() === norm) {
      return schema;
    }
  }
  return null;
}

/**
 * Returns all 8 canonical form schemas bundled in the frontend in official packet order.
 */
export function getAllStaticSchemas(): FormSchema[] {
  return Object.values(STATIC_SCHEMAS);
}
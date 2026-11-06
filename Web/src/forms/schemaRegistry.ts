import cs401 from './schemas/CS401.json';
import cs402 from './schemas/CS402.json';
import cs403 from './schemas/CS403.json';
import cs404 from './schemas/CS404.json';
import cs405 from './schemas/CS405.json';
import cs410 from './schemas/CS410.json';
import cs420 from './schemas/CS420.json';
import exitSurvey from './schemas/ExitSurvey.json';
import type { FormSchema } from './types';

export const STATIC_SCHEMAS: Record<string, FormSchema> = {
  CS401: cs401 as unknown as FormSchema,
  CS402: cs402 as unknown as FormSchema,
  CS403: cs403 as unknown as FormSchema,
  CS404: cs404 as unknown as FormSchema,
  CS405: cs405 as unknown as FormSchema,
  CS410: cs410 as unknown as FormSchema,
  CS420: cs420 as unknown as FormSchema,
  ExitSurvey: exitSurvey as unknown as FormSchema,
};

/**
 * Looks up a bundled canonical form schema by key (e.g. "CS401") or ID.
 */
export function getStaticSchema(keyOrId: string | number): FormSchema | null {
  const norm = String(keyOrId).trim().toLowerCase();
  for (const [key, schema] of Object.entries(STATIC_SCHEMAS)) {
    if (key.toLowerCase() === norm || schema.id.toLowerCase() === norm) {
      return schema;
    }
  }
  return null;
}

/**
 * Returns all 8 canonical form schemas bundled in the frontend.
 */
export function getAllStaticSchemas(): FormSchema[] {
  return Object.values(STATIC_SCHEMAS);
}

import {z} from 'zod';

/**
 * A URL-safe slug. Shared by the spec schemas and the studio contracts, which
 * is why it lives here rather than in either — importing one from the other
 * would close a cycle.
 */
export const IdentifierSchema = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const LocaleSchema = z
  .string()
  .min(2)
  .max(35)
  .regex(/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/);

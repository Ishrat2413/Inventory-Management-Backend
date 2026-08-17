import { z } from 'zod';

// ── Field Types ────────────────────────────────────────────────────────────
export const FIELD_TYPES = ['text', 'number', 'email', 'phone', 'date', 'dropdown', 'radio', 'checkbox', 'file', 'textarea'] as const;
export type FieldType = typeof FIELD_TYPES[number];

const FieldOptionSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
});

const ContentFieldSchema = z.object({
  label: z.string().min(1, 'Field label is required'),
  fieldType: z.enum(FIELD_TYPES),
  required: z.boolean().default(false),
  order: z.number().int().default(0),
  options: z.array(FieldOptionSchema).optional().nullable(),
  placeholder: z.string().optional().nullable(),
  helpText: z.string().optional().nullable(),
});

// ── Content Type CRUD ────────────────────────────────────────────────────
export const CreateContentTypeSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().optional().nullable(),
  fields: z.array(ContentFieldSchema).min(1, 'At least one field is required'),
});

export const UpdateContentTypeSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  fields: z.array(
    ContentFieldSchema.extend({ id: z.string().uuid().optional() })
  ).optional(),
});

// ── Employee Record ────────────────────────────────────────────────────────
export const UpsertEmployeeRecordSchema = z.object({
  data: z.record(z.string(), z.unknown()),
});

export type CreateContentTypeInput = z.infer<typeof CreateContentTypeSchema>;
export type UpdateContentTypeInput = z.infer<typeof UpdateContentTypeSchema>;
export type UpsertEmployeeRecordInput = z.infer<typeof UpsertEmployeeRecordSchema>;

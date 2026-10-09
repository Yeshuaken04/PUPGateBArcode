import { z } from 'zod';

// Strict regexes
const NAME_REGEX = /^[a-zA-Z\s.,'-]+$/;
const ID_NUMBER_REGEX = /^[A-Za-z0-9][A-Za-z0-9-]{1,28}[A-Za-z0-9]$/;
const PHONE_REGEX = /^(09|\+639)\d{9}$/;
const PLATE_REGEX = /^[A-Za-z0-9]{2,4}[-\s]?[A-Za-z0-9]{3,5}$/;

export const ScanRequestSchema = z.object({
  credential: z.string().min(1, 'Credential (RFID or QR) is required'),
  type: z.enum(['rfid', 'qr', 'manual', 'plate', 'barcode']).default('rfid'),
  gateCode: z.string().min(1, 'Gate code is required'),
  direction: z.enum(['entry', 'exit']).default('entry'),
  deviceEventId: z.string().optional(),
});

export const ManualOpenSchema = z.object({
  gateId: z.string().min(1, 'Gate ID is required'),
  reason: z.string().min(3, 'A valid reason is required for manual override'),
});

// Strict Student & Faculty Registration Schema
export const StudentFormSchema = z.object({
  student_number: z
    .string()
    .trim()
    .min(3, 'ID Number must be at least 3 characters')
    .max(30, 'ID Number cannot exceed 30 characters')
    .refine((val) => val !== '-1' && !val.startsWith('-'), {
      message: 'ID Number cannot be negative or "-1"',
    })
    .refine((val) => ID_NUMBER_REGEX.test(val), {
      message: 'ID Number must contain only alphanumeric characters and hyphens (e.g., 2021-12345 or FAC-2024-001)',
    }),

  first_name: z
    .string()
    .trim()
    .min(1, 'First name is required')
    .max(50, 'First name cannot exceed 50 characters')
    .refine((val) => val !== '-1' && !val.includes('-1'), {
      message: 'First name cannot contain "-1"',
    })
    .refine((val) => NAME_REGEX.test(val), {
      message: 'First name must contain letters and spaces only. Numbers and special symbols are strictly prohibited.',
    }),

  middle_name: z
    .string()
    .trim()
    .max(50, 'Middle name cannot exceed 50 characters')
    .optional()
    .nullable()
    .refine((val) => !val || (val !== '-1' && NAME_REGEX.test(val)), {
      message: 'Middle name must contain letters and spaces only (numbers prohibited).',
    }),

  last_name: z
    .string()
    .trim()
    .min(1, 'Last name is required')
    .max(50, 'Last name cannot exceed 50 characters')
    .refine((val) => val !== '-1' && !val.includes('-1'), {
      message: 'Last name cannot contain "-1"',
    })
    .refine((val) => NAME_REGEX.test(val), {
      message: 'Last name must contain letters and spaces only. Numbers are strictly prohibited.',
    }),

  person_type: z.enum(['student', 'faculty', 'staff', 'visitor']).default('student'),

  course: z.string().trim().max(80).optional().nullable(),
  department: z.string().trim().max(80).optional().nullable(),

  year_level: z
    .union([z.number(), z.string()])
    .optional()
    .nullable()
    .transform((val) => {
      if (val === '' || val === null || val === undefined) return null;
      const num = Number(val);
      return isNaN(num) ? null : num;
    })
    .refine((num) => num === null || (num >= 1 && num <= 6), {
      message: 'Year level must be between 1 and 6 (negative values or "-1" are strictly prohibited).',
    }),

  section: z.string().trim().max(10).optional().nullable(),

  contact_number: z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((val) => (val === '' ? null : val))
    .refine((val) => !val || (val !== '-1' && PHONE_REGEX.test(val)), {
      message: 'Contact number must be an 11-digit Philippine mobile number starting with 09 (e.g. 09171234567). Bawal ang "-1".',
    }),

  rfid_uid: z
    .string()
    .trim()
    .optional()
    .nullable()
    .refine((val) => !val || val !== '-1', { message: 'RFID UID cannot be "-1"' }),

  qr_code: z
    .string()
    .trim()
    .optional()
    .nullable()
    .refine((val) => !val || val !== '-1', { message: 'QR Code cannot be "-1"' }),

  status: z.enum(['active', 'inactive', 'suspended', 'graduated']).default('active'),
});

// Strict Vehicle Registration Schema
export const VehicleFormSchema = z.object({
  student_id: z.string().min(1, 'Student / Owner selection is required'),

  plate_number: z
    .string()
    .trim()
    .min(3, 'Plate number must be at least 3 characters')
    .max(15, 'Plate number cannot exceed 15 characters')
    .refine((val) => val !== '-1' && !val.startsWith('-'), {
      message: 'Plate number cannot be negative or "-1"',
    })
    .refine((val) => PLATE_REGEX.test(val), {
      message: 'Plate number must follow standard format (e.g., ABC-1234, ABC-123, or 123-ABC).',
    }),

  brand_model: z
    .string()
    .trim()
    .min(2, 'Brand and model are required')
    .max(60, 'Brand and model cannot exceed 60 characters')
    .refine((val) => val !== '-1', {
      message: 'Brand/model cannot be "-1"',
    }),

  vehicle_type: z.enum(['motorcycle', 'car', 'van', 'bicycle', 'other']).default('motorcycle'),
  color: z.string().trim().max(30).optional().nullable(),
  valid_until: z.string().optional().nullable(),
});

export const SyncOfflineEventsSchema = z.object({
  events: z.array(
    z.object({
      device_event_id: z.string(),
      credential: z.string(),
      type: z.enum(['rfid', 'qr', 'manual', 'plate', 'barcode']),
      gate_code: z.string(),
      direction: z.enum(['entry', 'exit']),
      scanned_at: z.string(),
    })
  ),
});

import { z } from "zod";

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(10, "Password must be at least 10 characters")
    .max(128),
  businessName: z.string().min(2, "Business name required"),
  vertical: z.enum([
    "manufacturing",
    "hvac",
    "plumbing",
    "electrical",
    "construction",
    "trucking",
    "agriculture",
  ]),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

// ─── Documents ────────────────────────────────────────────────────────────────

export const uploadRequestSchema = z.object({
  filename: z.string().min(1).max(255),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().positive().max(200 * 1024 * 1024), // 200 MB cap
});

export type UploadRequest = z.infer<typeof uploadRequestSchema>;

export const documentTypeSchema = z.enum([
  "work_order",
  "quote",
  "job_traveler",
  "purchase_order",
  "customer_list",
  "equipment_list",
  "qc_record",
  "financial",
  "tax_return",
  "lease",
  "contract",
  "certification",
  "employee_record",
  "voice_note",
  "other",
]);

export type DocumentType = z.infer<typeof documentTypeSchema>;

// ─── Extraction Output ─────────────────────────────────────────────────────────

export const extractedCustomerSchema = z.object({
  name: z.string(),
  revenueShare: z.number().min(0).max(1).optional(),
  contractStatus: z.enum(["active", "expired", "month-to-month"]).optional(),
  notes: z.string().optional(),
  confidence: z.number().min(0).max(1),
});

export const extractedEquipmentSchema = z.object({
  name: z.string(),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  yearInstalled: z.number().int().optional(),
  condition: z.enum(["excellent", "good", "fair", "poor"]).optional(),
  estimatedValue: z.number().optional(),
  confidence: z.number().min(0).max(1),
});

export const extractedFinancialSchema = z.object({
  year: z.number().int(),
  revenue: z.number().optional(),
  grossProfit: z.number().optional(),
  ebitda: z.number().optional(),
  ownerCompensation: z.number().optional(),
  confidence: z.number().min(0).max(1),
});

export const extractedProcessSchema = z.object({
  title: z.string(),
  steps: z.array(z.string()),
  owner: z.string().optional(),
  confidence: z.number().min(0).max(1),
});

// Discriminated union for the `data` blob in extracted_entities
export const extractedEntityDataSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("customer"), ...extractedCustomerSchema.shape }),
  z.object({ type: z.literal("equipment"), ...extractedEquipmentSchema.shape }),
  z.object({ type: z.literal("financial"), ...extractedFinancialSchema.shape }),
  z.object({ type: z.literal("process"), ...extractedProcessSchema.shape }),
]);

export type ExtractedEntityData = z.infer<typeof extractedEntityDataSchema>;

// ─── Readiness ────────────────────────────────────────────────────────────────

export const readinessBreakdownSchema = z.object({
  customers: z.number().min(0).max(100),
  financials: z.number().min(0).max(100),
  operations: z.number().min(0).max(100),
  equipment: z.number().min(0).max(100),
  people: z.number().min(0).max(100),
  compliance: z.number().min(0).max(100),
});

export type ReadinessBreakdown = z.infer<typeof readinessBreakdownSchema>;

// ─── Queue Messages ───────────────────────────────────────────────────────────

export const documentJobSchema = z.object({
  documentId: z.string(),
  orgId: z.string(),
  r2Key: z.string(),
  mimeType: z.string(),
  vertical: z.string(),
});

export type DocumentJob = z.infer<typeof documentJobSchema>;

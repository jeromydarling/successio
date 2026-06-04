import { sqliteTable, text, integer, real, index, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const timestamps = {
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
};

// ─── Core Entities ────────────────────────────────────────────────────────────

export const organizations = sqliteTable(
  "organizations",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    vertical: text("vertical").notNull(), // manufacturing | hvac | plumbing | electrical | construction | trucking | agriculture
    location: text("location"),
    founded: integer("founded"),
    employeeCount: integer("employee_count"),
    annualRevenue: real("annual_revenue"),
    description: text("description"),
    // Multi-tenant: which association this member business belongs to (if any).
    associationId: text("association_id"),
    ...timestamps,
  },
  (t) => [index("orgs_assoc_idx").on(t.associationId)]
);

// ─── Associations (multi-tenant: trade associations / foundations / alliances) ──

export const associations = sqliteTable("associations", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  primaryColor: text("primary_color"),
  logoUrl: text("logo_url"),
  website: text("website"),
  ...timestamps,
});

export const associationInvites = sqliteTable(
  "association_invites",
  {
    id: text("id").primaryKey(),
    associationId: text("association_id")
      .notNull()
      .references(() => associations.id, { onDelete: "cascade" }),
    businessName: text("business_name").notNull(),
    contactEmail: text("contact_email").notNull(),
    vertical: text("vertical").notNull(),
    token: text("token").notNull().unique(),
    status: text("status").notNull().default("pending"), // pending | claimed
    claimedOrgId: text("claimed_org_id"),
    ...timestamps,
  },
  (t) => [
    index("invites_assoc_idx").on(t.associationId),
    index("invites_token_idx").on(t.token),
  ]
);

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    email: text("email").notNull().unique(),
    name: text("name").notNull(),
    role: text("role").notNull().default("owner"), // owner | advisor | viewer | association_admin
    passwordHash: text("password_hash").notNull(),
    // Set for association_admin users — the association they administer.
    associationId: text("association_id"),
    // Email verification: null until the user confirms their address.
    emailVerifiedAt: integer("email_verified_at", { mode: "timestamp" }),
    ...timestamps,
  },
  (t) => [index("users_org_idx").on(t.orgId)]
);

/**
 * Single-use, expiring tokens for email flows (password reset, email
 * verification). The token value is stored hashed; the raw token only ever
 * lives in the emailed link.
 */
export const authTokens = sqliteTable(
  "auth_tokens",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(), // password_reset | email_verify
    tokenHash: text("token_hash").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    usedAt: integer("used_at", { mode: "timestamp" }),
    ...timestamps,
  },
  (t) => [
    index("auth_tokens_user_idx").on(t.userId),
    uniqueIndex("auth_tokens_hash_idx").on(t.tokenHash),
  ]
);

export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    ...timestamps,
  },
  (t) => [index("sessions_user_idx").on(t.userId)]
);

// ─── Document Pipeline ────────────────────────────────────────────────────────

export const documents = sqliteTable(
  "documents",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    uploadedBy: text("uploaded_by")
      .notNull()
      .references(() => users.id),
    r2Key: text("r2_key").notNull(),
    originalName: text("original_name").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    fileType: text("file_type"), // pdf | image | spreadsheet | docx | audio | unknown
    documentType: text("document_type"), // work_order | quote | customer_list | equipment_list | financial | …
    status: text("status").notNull().default("queued"), // queued | ocr | extracting | embedding | complete | failed | needs_review
    errorMessage: text("error_message"),
    ocrText: text("ocr_text"),
    ocrConfidence: real("ocr_confidence"),
    ...timestamps,
  },
  (t) => [
    index("documents_org_idx").on(t.orgId),
    index("documents_status_idx").on(t.status),
  ]
);

export const documentChunks = sqliteTable(
  "document_chunks",
  {
    id: text("id").primaryKey(),
    documentId: text("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    orgId: text("org_id").notNull(),
    chunkIndex: integer("chunk_index").notNull(),
    text: text("text").notNull(),
    vectorId: text("vector_id"), // Vectorize vector ID
    ...timestamps,
  },
  (t) => [index("chunks_doc_idx").on(t.documentId)]
);

export const extractedEntities = sqliteTable(
  "extracted_entities",
  {
    id: text("id").primaryKey(),
    documentId: text("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    orgId: text("org_id").notNull(),
    entityType: text("entity_type").notNull(), // customer | equipment | process | employee | financial | …
    data: text("data").notNull(), // JSON blob (validated via Zod before write)
    confidence: real("confidence").notNull(), // 0–1
    needsReview: integer("needs_review", { mode: "boolean" }).notNull().default(false),
    reviewedAt: integer("reviewed_at", { mode: "timestamp" }),
    ...timestamps,
  },
  (t) => [
    index("entities_org_idx").on(t.orgId),
    index("entities_type_idx").on(t.entityType),
    index("entities_review_idx").on(t.needsReview),
  ]
);

// ─── Business Knowledge ───────────────────────────────────────────────────────

export const customers = sqliteTable(
  "customers",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    revenueShare: real("revenue_share"), // 0–1 fraction of total
    contractStatus: text("contract_status"), // active | expired | month-to-month
    notes: text("notes"),
    sourceDocumentId: text("source_document_id"),
    ...timestamps,
  },
  (t) => [
    index("customers_org_idx").on(t.orgId),
    // Dedup: one record per (doc, name). Manual rows (null doc) stay distinct.
    uniqueIndex("customers_dedup_idx").on(t.orgId, t.sourceDocumentId, t.name),
  ]
);

export const equipment = sqliteTable(
  "equipment",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    manufacturer: text("manufacturer"),
    model: text("model"),
    yearInstalled: integer("year_installed"),
    condition: text("condition"), // excellent | good | fair | poor
    estimatedValue: real("estimated_value"),
    sourceDocumentId: text("source_document_id"),
    ...timestamps,
  },
  (t) => [
    index("equipment_org_idx").on(t.orgId),
    uniqueIndex("equipment_dedup_idx").on(t.orgId, t.sourceDocumentId, t.name),
  ]
);

export const processes = sqliteTable(
  "processes",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    steps: text("steps").notNull(), // JSON array of step strings
    owner: text("owner"),
    source: text("source").notNull().default("manual"), // manual | voice | extracted
    sourceDocumentId: text("source_document_id"),
    ...timestamps,
  },
  (t) => [
    index("processes_org_idx").on(t.orgId),
    uniqueIndex("processes_dedup_idx").on(t.orgId, t.sourceDocumentId, t.title),
  ]
);

export const employees = sqliteTable(
  "employees",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    role: text("role").notNull(),
    tenureYears: real("tenure_years"),
    isKeyPerson: integer("is_key_person", { mode: "boolean" }).default(false),
    notes: text("notes"),
    sourceDocumentId: text("source_document_id"),
    ...timestamps,
  },
  (t) => [
    index("employees_org_idx").on(t.orgId),
    uniqueIndex("employees_dedup_idx").on(t.orgId, t.sourceDocumentId, t.name),
  ]
);

export const financials = sqliteTable(
  "financials",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    year: integer("year").notNull(),
    revenue: real("revenue"),
    grossProfit: real("gross_profit"),
    ebitda: real("ebitda"),
    ownerCompensation: real("owner_compensation"),
    sourceDocumentId: text("source_document_id"),
    ...timestamps,
  },
  (t) => [
    index("financials_org_idx").on(t.orgId),
    uniqueIndex("financials_dedup_idx").on(t.orgId, t.sourceDocumentId, t.year),
  ]
);

// ─── Readiness ────────────────────────────────────────────────────────────────

export const readinessScores = sqliteTable(
  "readiness_scores",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    score: integer("score").notNull(), // 0–100
    breakdown: text("breakdown").notNull(), // JSON: category → score
    ...timestamps,
  },
  (t) => [index("scores_org_idx").on(t.orgId)]
);

export const readinessChecklist = sqliteTable(
  "readiness_checklist",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    vertical: text("vertical").notNull(),
    category: text("category").notNull(),
    itemKey: text("item_key").notNull(),
    label: text("label").notNull(),
    completed: integer("completed", { mode: "boolean" }).notNull().default(false),
    completedAt: integer("completed_at", { mode: "timestamp" }),
    ...timestamps,
  },
  (t) => [index("checklist_org_idx").on(t.orgId)]
);

// ─── Deal Room ────────────────────────────────────────────────────────────────

export const businessProfiles = sqliteTable(
  "business_profiles",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    content: text("content").notNull(), // JSON: structured CIM sections
    pdfR2Key: text("pdf_r2_key"),
    isDraft: integer("is_draft", { mode: "boolean" }).notNull().default(true),
    ...timestamps,
  },
  (t) => [index("profiles_org_idx").on(t.orgId)]
);

export const shareTokens = sqliteTable(
  "share_tokens",
  {
    id: text("id").primaryKey(), // the token itself (short UUID)
    profileId: text("profile_id")
      .notNull()
      .references(() => businessProfiles.id, { onDelete: "cascade" }),
    orgId: text("org_id").notNull(),
    tier: text("tier").notNull(), // public | nda | lender | buyer
    expiresAt: integer("expires_at", { mode: "timestamp" }),
    viewCount: integer("view_count").notNull().default(0),
    maxViews: integer("max_views"),
    ...timestamps,
  },
  (t) => [index("tokens_profile_idx").on(t.profileId)]
);

export const shareViews = sqliteTable(
  "share_views",
  {
    id: text("id").primaryKey(),
    tokenId: text("token_id")
      .notNull()
      .references(() => shareTokens.id, { onDelete: "cascade" }),
    orgId: text("org_id").notNull(),
    viewerName: text("viewer_name"),
    viewerEmail: text("viewer_email"),
    ipHash: text("ip_hash"), // hashed for privacy
    sectionsViewed: text("sections_viewed"), // JSON array
    durationSeconds: integer("duration_seconds"),
    ...timestamps,
  },
  (t) => [index("views_token_idx").on(t.tokenId)]
);

// ─── Milestones (History Timeline) ───────────────────────────────────────────

export const orgMilestones = sqliteTable(
  "org_milestones",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    year: integer("year").notNull(),
    period: text("period"), // "Q3", "Spring", "Today"
    category: text("category").notNull(), // founding | financial | equipment | people | customer | operations | compliance | milestone
    title: text("title").notNull(),
    description: text("description").notNull(),
    metricLabel: text("metric_label"),
    metricValue: text("metric_value"),
    source: text("source"), // "Contract records", "P&L 2007–2010" etc.
    sourceDocumentId: text("source_document_id"),
    isManual: integer("is_manual", { mode: "boolean" }).notNull().default(false),
    ...timestamps,
  },
  (t) => [
    index("milestones_org_idx").on(t.orgId),
    index("milestones_year_idx").on(t.year),
    uniqueIndex("milestones_dedup_idx").on(t.orgId, t.sourceDocumentId, t.year, t.title),
  ]
);

// ─── Re-exports for convenience ───────────────────────────────────────────────

export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type AuthToken = typeof authTokens.$inferSelect;
export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
export type ExtractedEntity = typeof extractedEntities.$inferSelect;
export type ReadinessScore = typeof readinessScores.$inferSelect;
export type ShareToken = typeof shareTokens.$inferSelect;
export type OrgMilestone = typeof orgMilestones.$inferSelect;
export type Association = typeof associations.$inferSelect;
export type AssociationInvite = typeof associationInvites.$inferSelect;

"use client";

/**
 * Business Data — manual entry and correction for the records AI extraction
 * builds (customers, equipment, people, financials). When a document misses
 * something, the owner types it in here; every save refreshes the readiness
 * score just like a document extraction does.
 */

import { useState } from "react";
import { Users, Wrench, DollarSign, UserRound, Plus, Pencil, Trash2, FileText } from "lucide-react";
import { AppTopNav } from "@/components/app/app-topnav";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc-client";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "customers", label: "Customers", icon: Users },
  { key: "equipment", label: "Equipment", icon: Wrench },
  { key: "employees", label: "People", icon: UserRound },
  { key: "financials", label: "Financials", icon: DollarSign },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function BusinessDataPage() {
  const [tab, setTab] = useState<TabKey>("customers");

  return (
    <>
      <AppTopNav title="Business Data" />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-4xl space-y-5">
          <p className="text-sm text-ink-soft">
            Records extracted from your documents land here automatically. If something's
            missing or wrong, add or fix it by hand — the readiness score updates either way.
          </p>

          <div className="flex gap-1.5 flex-wrap">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all",
                  tab === key
                    ? "border-amber/40 bg-amber/10 text-amber-bright"
                    : "border-edge text-ink-soft hover:border-edge-strong hover:text-ink"
                )}
              >
                <Icon className="size-3.5" />
                {label}
              </button>
            ))}
          </div>

          {tab === "customers" && <CustomersSection />}
          {tab === "equipment" && <EquipmentSection />}
          {tab === "employees" && <EmployeesSection />}
          {tab === "financials" && <FinancialsSection />}
        </div>
      </main>
    </>
  );
}

// ── Shared bits ───────────────────────────────────────────────────────────────

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1 block text-xs font-medium text-ink-soft">{label}</span>
      {children}
    </label>
  );
}

function EmptyState({ what }: { what: string }) {
  return (
    <div className="rounded-xl border border-dashed border-edge py-10 text-center">
      <FileText className="mx-auto size-8 text-ink-faint" />
      <p className="mt-2 text-sm text-ink-soft">
        No {what} yet — upload documents or add one manually above.
      </p>
    </div>
  );
}

function RowActions({ onEdit, onDelete, deleting }: { onEdit: () => void; onDelete: () => void; deleting: boolean }) {
  return (
    <div className="flex justify-end gap-1">
      <button
        onClick={onEdit}
        className="rounded-md p-1.5 text-ink-faint transition-colors hover:bg-white/5 hover:text-ink"
        aria-label="Edit"
      >
        <Pencil className="size-3.5" />
      </button>
      <button
        onClick={onDelete}
        disabled={deleting}
        className="rounded-md p-1.5 text-ink-faint transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
        aria-label="Delete"
      >
        <Trash2 className="size-3.5" />
      </button>
    </div>
  );
}

const card = "rounded-2xl border border-edge bg-canvas-soft/50 p-5";
const th = "px-3 py-2 text-left text-xs font-medium text-ink-faint";
const td = "px-3 py-2.5 text-sm text-ink";
const tdSoft = "px-3 py-2.5 text-sm text-ink-soft";

const num = (v: string) => (v.trim() === "" ? null : Number(v));

// ── Customers ─────────────────────────────────────────────────────────────────

function CustomersSection() {
  const utils = trpc.useUtils();
  const { data: rows = [] } = trpc.businesses.customers.useQuery();
  const save = trpc.businesses.saveCustomer.useMutation({
    onSuccess: () => { utils.businesses.customers.invalidate(); setForm(null); },
  });
  const del = trpc.businesses.deleteCustomer.useMutation({
    onSuccess: () => utils.businesses.customers.invalidate(),
  });

  const [form, setForm] = useState<null | { id?: string; name: string; revenuePct: string; contractStatus: string; notes: string }>(null);

  return (
    <div className={card}>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink">Customers ({rows.length})</h2>
        <Button size="sm" variant="outline" onClick={() => setForm({ name: "", revenuePct: "", contractStatus: "", notes: "" })}>
          <Plus className="size-3.5" /> Add customer
        </Button>
      </div>

      {form && (
        <form
          className="mt-4 space-y-3 rounded-xl border border-amber/20 bg-amber/[0.03] p-4"
          onSubmit={(e) => {
            e.preventDefault();
            const pct = num(form.revenuePct);
            save.mutate({
              id: form.id,
              name: form.name,
              revenueShare: pct === null ? null : Math.min(Math.max(pct, 0), 100) / 100,
              contractStatus: (form.contractStatus || null) as "active" | "expired" | "month-to-month" | null,
              notes: form.notes || null,
            });
          }}
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Customer name *" className="sm:col-span-1">
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-base" placeholder="Acme Fabrication" />
            </Field>
            <Field label="% of revenue">
              <input type="number" min="0" max="100" step="0.1" value={form.revenuePct} onChange={(e) => setForm({ ...form, revenuePct: e.target.value })} className="input-base" placeholder="25" />
            </Field>
            <Field label="Contract status">
              <select value={form.contractStatus} onChange={(e) => setForm({ ...form, contractStatus: e.target.value })} className="input-base">
                <option value="">—</option>
                <option value="active">Active</option>
                <option value="month-to-month">Month-to-month</option>
                <option value="expired">Expired</option>
              </select>
            </Field>
          </div>
          <Field label="Notes">
            <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input-base" placeholder="Since 2009, quarterly blanket orders" />
          </Field>
          <FormActions saving={save.isPending} editing={!!form.id} error={save.error?.message} onCancel={() => setForm(null)} />
        </form>
      )}

      {rows.length === 0 ? (
        <div className="mt-4"><EmptyState what="customers" /></div>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-edge">
                <th className={th}>Name</th>
                <th className={th}>% revenue</th>
                <th className={th}>Contract</th>
                <th className={th}>Source</th>
                <th className={th} />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-edge/50">
                  <td className={td}>{r.name}</td>
                  <td className={tdSoft}>{r.revenueShare != null ? `${Math.round(r.revenueShare * 100)}%` : "—"}</td>
                  <td className={cn(tdSoft, "capitalize")}>{r.contractStatus ?? "—"}</td>
                  <td className={tdSoft}>{r.sourceDocumentId ? "Extracted" : "Manual"}</td>
                  <td className={td}>
                    <RowActions
                      onEdit={() => setForm({ id: r.id, name: r.name, revenuePct: r.revenueShare != null ? String(Math.round(r.revenueShare * 1000) / 10) : "", contractStatus: r.contractStatus ?? "", notes: r.notes ?? "" })}
                      onDelete={() => del.mutate({ id: r.id })}
                      deleting={del.isPending}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Equipment ─────────────────────────────────────────────────────────────────

function EquipmentSection() {
  const utils = trpc.useUtils();
  const { data: rows = [] } = trpc.businesses.equipment.useQuery();
  const save = trpc.businesses.saveEquipment.useMutation({
    onSuccess: () => { utils.businesses.equipment.invalidate(); setForm(null); },
  });
  const del = trpc.businesses.deleteEquipment.useMutation({
    onSuccess: () => utils.businesses.equipment.invalidate(),
  });

  const [form, setForm] = useState<null | { id?: string; name: string; manufacturer: string; model: string; yearInstalled: string; condition: string; estimatedValue: string }>(null);

  return (
    <div className={card}>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink">Equipment ({rows.length})</h2>
        <Button size="sm" variant="outline" onClick={() => setForm({ name: "", manufacturer: "", model: "", yearInstalled: "", condition: "", estimatedValue: "" })}>
          <Plus className="size-3.5" /> Add equipment
        </Button>
      </div>

      {form && (
        <form
          className="mt-4 space-y-3 rounded-xl border border-amber/20 bg-amber/[0.03] p-4"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate({
              id: form.id,
              name: form.name,
              manufacturer: form.manufacturer || null,
              model: form.model || null,
              yearInstalled: num(form.yearInstalled),
              condition: (form.condition || null) as "excellent" | "good" | "fair" | "poor" | null,
              estimatedValue: num(form.estimatedValue),
            });
          }}
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Equipment name *">
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-base" placeholder="CNC Lathe" />
            </Field>
            <Field label="Manufacturer">
              <input value={form.manufacturer} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} className="input-base" placeholder="Haas" />
            </Field>
            <Field label="Model">
              <input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} className="input-base" placeholder="ST-30" />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Year installed">
              <input type="number" min="1900" max="2100" value={form.yearInstalled} onChange={(e) => setForm({ ...form, yearInstalled: e.target.value })} className="input-base" placeholder="2015" />
            </Field>
            <Field label="Condition">
              <select value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })} className="input-base">
                <option value="">—</option>
                <option value="excellent">Excellent</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="poor">Poor</option>
              </select>
            </Field>
            <Field label="Estimated value (USD)">
              <input type="number" min="0" value={form.estimatedValue} onChange={(e) => setForm({ ...form, estimatedValue: e.target.value })} className="input-base" placeholder="85000" />
            </Field>
          </div>
          <FormActions saving={save.isPending} editing={!!form.id} error={save.error?.message} onCancel={() => setForm(null)} />
        </form>
      )}

      {rows.length === 0 ? (
        <div className="mt-4"><EmptyState what="equipment" /></div>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-edge">
                <th className={th}>Name</th>
                <th className={th}>Make / model</th>
                <th className={th}>Year</th>
                <th className={th}>Condition</th>
                <th className={th}>Value</th>
                <th className={th} />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-edge/50">
                  <td className={td}>{r.name}</td>
                  <td className={tdSoft}>{[r.manufacturer, r.model].filter(Boolean).join(" ") || "—"}</td>
                  <td className={tdSoft}>{r.yearInstalled ?? "—"}</td>
                  <td className={cn(tdSoft, "capitalize")}>{r.condition ?? "—"}</td>
                  <td className={tdSoft}>{r.estimatedValue != null ? `$${r.estimatedValue.toLocaleString()}` : "—"}</td>
                  <td className={td}>
                    <RowActions
                      onEdit={() => setForm({ id: r.id, name: r.name, manufacturer: r.manufacturer ?? "", model: r.model ?? "", yearInstalled: r.yearInstalled?.toString() ?? "", condition: r.condition ?? "", estimatedValue: r.estimatedValue?.toString() ?? "" })}
                      onDelete={() => del.mutate({ id: r.id })}
                      deleting={del.isPending}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── People ────────────────────────────────────────────────────────────────────

function EmployeesSection() {
  const utils = trpc.useUtils();
  const { data: rows = [] } = trpc.businesses.employees.useQuery();
  const save = trpc.businesses.saveEmployee.useMutation({
    onSuccess: () => { utils.businesses.employees.invalidate(); setForm(null); },
  });
  const del = trpc.businesses.deleteEmployee.useMutation({
    onSuccess: () => utils.businesses.employees.invalidate(),
  });

  const [form, setForm] = useState<null | { id?: string; name: string; role: string; tenureYears: string; isKeyPerson: boolean; notes: string }>(null);

  return (
    <div className={card}>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink">People ({rows.length})</h2>
        <Button size="sm" variant="outline" onClick={() => setForm({ name: "", role: "", tenureYears: "", isKeyPerson: false, notes: "" })}>
          <Plus className="size-3.5" /> Add person
        </Button>
      </div>

      {form && (
        <form
          className="mt-4 space-y-3 rounded-xl border border-amber/20 bg-amber/[0.03] p-4"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate({
              id: form.id,
              name: form.name,
              role: form.role,
              tenureYears: num(form.tenureYears),
              isKeyPerson: form.isKeyPerson,
              notes: form.notes || null,
            });
          }}
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Name *">
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-base" placeholder="Maria Lopez" />
            </Field>
            <Field label="Role *">
              <input required value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="input-base" placeholder="Shop foreman" />
            </Field>
            <Field label="Years with company">
              <input type="number" min="0" max="80" step="0.5" value={form.tenureYears} onChange={(e) => setForm({ ...form, tenureYears: e.target.value })} className="input-base" placeholder="12" />
            </Field>
          </div>
          <div className="flex items-center gap-2">
            <input
              id="keyperson"
              type="checkbox"
              checked={form.isKeyPerson}
              onChange={(e) => setForm({ ...form, isKeyPerson: e.target.checked })}
              className="size-4 rounded border-edge accent-amber-500"
            />
            <label htmlFor="keyperson" className="text-xs text-ink-soft">
              Key person — the business depends on them
            </label>
          </div>
          <Field label="Notes">
            <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input-base" placeholder="Only one who can run the Mazak" />
          </Field>
          <FormActions saving={save.isPending} editing={!!form.id} error={save.error?.message} onCancel={() => setForm(null)} />
        </form>
      )}

      {rows.length === 0 ? (
        <div className="mt-4"><EmptyState what="people" /></div>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-edge">
                <th className={th}>Name</th>
                <th className={th}>Role</th>
                <th className={th}>Tenure</th>
                <th className={th}>Key person</th>
                <th className={th} />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-edge/50">
                  <td className={td}>{r.name}</td>
                  <td className={tdSoft}>{r.role}</td>
                  <td className={tdSoft}>{r.tenureYears != null ? `${r.tenureYears} yrs` : "—"}</td>
                  <td className={tdSoft}>{r.isKeyPerson ? <span className="text-amber">Yes</span> : "—"}</td>
                  <td className={td}>
                    <RowActions
                      onEdit={() => setForm({ id: r.id, name: r.name, role: r.role, tenureYears: r.tenureYears?.toString() ?? "", isKeyPerson: !!r.isKeyPerson, notes: r.notes ?? "" })}
                      onDelete={() => del.mutate({ id: r.id })}
                      deleting={del.isPending}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Financials ────────────────────────────────────────────────────────────────

function FinancialsSection() {
  const utils = trpc.useUtils();
  const { data: rows = [] } = trpc.businesses.financials.useQuery();
  const save = trpc.businesses.saveFinancial.useMutation({
    onSuccess: () => { utils.businesses.financials.invalidate(); setForm(null); },
  });
  const del = trpc.businesses.deleteFinancial.useMutation({
    onSuccess: () => utils.businesses.financials.invalidate(),
  });

  const [form, setForm] = useState<null | { id?: string; year: string; revenue: string; grossProfit: string; ebitda: string; ownerCompensation: string }>(null);

  const money = (v: number | null) => (v != null ? `$${v.toLocaleString()}` : "—");

  return (
    <div className={card}>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink">Financials by year ({rows.length})</h2>
        <Button size="sm" variant="outline" onClick={() => setForm({ year: "", revenue: "", grossProfit: "", ebitda: "", ownerCompensation: "" })}>
          <Plus className="size-3.5" /> Add year
        </Button>
      </div>

      {form && (
        <form
          className="mt-4 space-y-3 rounded-xl border border-amber/20 bg-amber/[0.03] p-4"
          onSubmit={(e) => {
            e.preventDefault();
            const year = num(form.year);
            if (year === null) return;
            save.mutate({
              id: form.id,
              year,
              revenue: num(form.revenue),
              grossProfit: num(form.grossProfit),
              ebitda: num(form.ebitda),
              ownerCompensation: num(form.ownerCompensation),
            });
          }}
        >
          <div className="grid gap-3 sm:grid-cols-5">
            <Field label="Year *">
              <input required type="number" min="1980" max="2100" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} className="input-base" placeholder="2025" />
            </Field>
            <Field label="Revenue">
              <input type="number" min="0" value={form.revenue} onChange={(e) => setForm({ ...form, revenue: e.target.value })} className="input-base" placeholder="6240000" />
            </Field>
            <Field label="Gross profit">
              <input type="number" value={form.grossProfit} onChange={(e) => setForm({ ...form, grossProfit: e.target.value })} className="input-base" placeholder="2100000" />
            </Field>
            <Field label="EBITDA">
              <input type="number" value={form.ebitda} onChange={(e) => setForm({ ...form, ebitda: e.target.value })} className="input-base" placeholder="890000" />
            </Field>
            <Field label="Owner comp">
              <input type="number" min="0" value={form.ownerCompensation} onChange={(e) => setForm({ ...form, ownerCompensation: e.target.value })} className="input-base" placeholder="180000" />
            </Field>
          </div>
          <FormActions saving={save.isPending} editing={!!form.id} error={save.error?.message} onCancel={() => setForm(null)} />
        </form>
      )}

      {rows.length === 0 ? (
        <div className="mt-4"><EmptyState what="financial records" /></div>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-edge">
                <th className={th}>Year</th>
                <th className={th}>Revenue</th>
                <th className={th}>Gross profit</th>
                <th className={th}>EBITDA</th>
                <th className={th}>Owner comp</th>
                <th className={th} />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-edge/50">
                  <td className={cn(td, "font-mono")}>{r.year}</td>
                  <td className={tdSoft}>{money(r.revenue)}</td>
                  <td className={tdSoft}>{money(r.grossProfit)}</td>
                  <td className={tdSoft}>{money(r.ebitda)}</td>
                  <td className={tdSoft}>{money(r.ownerCompensation)}</td>
                  <td className={td}>
                    <RowActions
                      onEdit={() => setForm({ id: r.id, year: r.year.toString(), revenue: r.revenue?.toString() ?? "", grossProfit: r.grossProfit?.toString() ?? "", ebitda: r.ebitda?.toString() ?? "", ownerCompensation: r.ownerCompensation?.toString() ?? "" })}
                      onDelete={() => del.mutate({ id: r.id })}
                      deleting={del.isPending}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FormActions({ saving, editing, error, onCancel }: { saving: boolean; editing: boolean; error?: string; onCancel: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <Button type="submit" size="sm" disabled={saving}>
        {saving ? "Saving…" : editing ? "Save changes" : "Add"}
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
        Cancel
      </Button>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}

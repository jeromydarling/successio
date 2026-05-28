import {
  Factory,
  TrendingUp,
  Wrench,
  Users,
  Handshake,
  ClipboardCheck,
  ShieldCheck,
  Flag,
  type LucideIcon,
} from "lucide-react";
import type { MilestoneCategory } from "@/lib/demo-history";

export interface CategoryMeta {
  label: string;
  icon: LucideIcon;
  /** Tailwind text color for the accent. */
  text: string;
  /** Inline rgb for glows/rings where we need alpha control. */
  rgb: string;
}

export const CATEGORY_META: Record<MilestoneCategory, CategoryMeta> = {
  founding: { label: "Founding", icon: Factory, text: "text-amber-bright", rgb: "251,191,36" },
  financial: { label: "Financial", icon: TrendingUp, text: "text-emerald-400", rgb: "52,211,153" },
  equipment: { label: "Equipment", icon: Wrench, text: "text-sky-400", rgb: "56,189,248" },
  people: { label: "People", icon: Users, text: "text-violet-400", rgb: "167,139,250" },
  customer: { label: "Customers", icon: Handshake, text: "text-orange-400", rgb: "251,146,60" },
  operations: { label: "Operations", icon: ClipboardCheck, text: "text-cyan-400", rgb: "34,211,238" },
  compliance: { label: "Compliance", icon: ShieldCheck, text: "text-teal-400", rgb: "45,212,191" },
  milestone: { label: "Milestone", icon: Flag, text: "text-amber", rgb: "245,158,11" },
};

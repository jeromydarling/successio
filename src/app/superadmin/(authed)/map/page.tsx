"use client";

import { CustomerMap } from "@/components/superadmin/customer-map";

export default function MapPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Customer Map</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Geographic distribution of all customers. Marker colors reflect the latest readiness score.
        </p>
      </div>
      <CustomerMap />
    </div>
  );
}

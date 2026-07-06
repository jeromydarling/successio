import dynamic from "next/dynamic";

const CustomerMap = dynamic(
  () => import("@/components/superadmin/customer-map").then((m) => m.CustomerMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-[520px] text-sm text-slate-400">
        Loading map…
      </div>
    ),
  }
);

export default function MapPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Customer Map</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Geographic distribution of all customers. Colors reflect churn risk and readiness score.
        </p>
      </div>
      <CustomerMap />
    </div>
  );
}

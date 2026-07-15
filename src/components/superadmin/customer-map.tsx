"use client";

import { useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc-client";
import Link from "next/link";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — Leaflet CSS has no type declarations
import "leaflet/dist/leaflet.css";

function markerColor(score: number | null): string {
  if (score === null) return "#94a3b8"; // slate-400
  if (score >= 75) return "#22c55e";   // green-500
  if (score >= 50) return "#f59e0b";   // amber-500
  return "#ef4444";                    // red-400
}

export function CustomerMap() {
  const { data, isLoading, error } = trpc.superadmin.mapData.useQuery();
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leafletRef = useRef<any>(null);

  useEffect(() => {
    if (!data || data.length === 0 || !mapRef.current) return;

    async function initMap() {
      const L = (await import("leaflet")).default;

      // Destroy existing map instance before re-init
      if (leafletRef.current) {
        leafletRef.current.remove();
        leafletRef.current = null;
      }

      const geocoded = (data ?? []).filter(
        (o): o is typeof o & { lat: number; lng: number } =>
          o.lat !== null && o.lng !== null
      );
      if (geocoded.length === 0) return;

      const bounds = geocoded.map((o) => [o.lat!, o.lng!] as [number, number]);

      const map = L.map(mapRef.current!, { scrollWheelZoom: true });
      leafletRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 18,
      }).addTo(map);

      geocoded.forEach((org) => {
        const color = markerColor(org.latestScore ?? null);

        const icon = L.divIcon({
          className: "",
          html: `<div style="
            width:14px;height:14px;border-radius:50%;
            background:${color};border:2px solid white;
            box-shadow:0 1px 3px rgba(0,0,0,0.4);
          "></div>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        });

        const marker = L.marker([org.lat!, org.lng!], { icon }).addTo(map);
        marker.bindPopup(`
          <div style="font-family:system-ui;min-width:160px">
            <strong style="font-size:13px">${org.name}</strong><br/>
            <span style="font-size:11px;color:#64748b">${org.vertical} · ${org.location ?? "—"}</span><br/>
            <span style="font-size:11px">Score: ${org.latestScore ?? "—"}</span><br/>
            <a href="/superadmin/orgs/${org.id}" style="font-size:11px;color:#d97706">View details →</a>
          </div>
        `);
      });

      map.fitBounds(bounds, { padding: [40, 40] });
    }

    initMap().catch(console.error);

    return () => {
      if (leafletRef.current) {
        leafletRef.current.remove();
        leafletRef.current = null;
      }
    };
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[500px] text-sm text-slate-400">
        Loading map data…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[500px] text-sm text-red-400">
        Failed to load map data.
      </div>
    );
  }

  const geocoded = (data ?? []).filter((o) => o.lat !== null && o.lng !== null);
  const pending = (data ?? []).length - geocoded.length;


  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex items-center gap-6 text-xs text-slate-500">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-green-500 inline-block" />
          Healthy / High score
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
          At risk / Mid score
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-red-400 inline-block" />
          Critical / Low score
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-slate-400 inline-block" />
          No score yet
        </div>
        {pending > 0 && (
          <span className="ml-auto text-slate-400">
            {pending} location{pending > 1 ? "s" : ""} being geocoded…
          </span>
        )}
      </div>

      {/* Map */}
      <div
        ref={mapRef}
        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden"
        style={{ height: 520 }}
      />

      {/* Table fallback if no geocoded orgs yet */}
      {geocoded.length === 0 && (
        <div className="text-sm text-slate-400 text-center py-6">
          No locations geocoded yet — locations are resolved in the background on first map load.
          Refresh in a few moments.
        </div>
      )}

      {/* List below map */}
      {(data ?? []).length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800">
                <th className="text-left font-medium text-slate-500 px-4 py-3">Business</th>
                <th className="text-left font-medium text-slate-500 px-4 py-3 hidden md:table-cell">Location</th>
                <th className="text-right font-medium text-slate-500 px-4 py-3">Score</th>
                <th className="text-left font-medium text-slate-500 px-4 py-3">Geocoded</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((org) => (
                <tr
                  key={org.id}
                  className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                >
                  <td className="px-4 py-2.5">
                    <Link
                      href={`/superadmin/orgs/${org.id}`}
                      className="font-medium text-slate-900 dark:text-slate-100 hover:text-amber-600"
                    >
                      {org.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-slate-500 hidden md:table-cell">
                    {org.location ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-slate-900 dark:text-slate-100">
                    {org.latestScore ?? "—"}
                  </td>
                  <td className="px-4 py-2.5">
                    {org.lat !== null ? (
                      <span className="text-green-600 dark:text-green-400 text-xs">Yes</span>
                    ) : (
                      <span className="text-slate-400 text-xs">Pending</span>
                    )}
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

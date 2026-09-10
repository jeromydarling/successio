"use client";

/**
 * Deal Room → "List on the marketplace". Seller opt-in for a blind listing
 * built from the published profile. The marketplace itself is a private
 * beta until there's real inventory, and this card says so plainly.
 */

import { Store, ExternalLink } from "lucide-react";
import { trpc } from "@/lib/trpc-client";
import { Button } from "@/components/ui/button";

export function MarketplaceCard() {
  const utils = trpc.useUtils();
  const mine = trpc.marketplace.mine.useQuery();
  const publish = trpc.marketplace.publish.useMutation({ onSuccess: () => utils.marketplace.mine.invalidate() });
  const pause = trpc.marketplace.pause.useMutation({ onSuccess: () => utils.marketplace.mine.invalidate() });

  const listing = mine.data?.listing;
  const live = listing?.status === "live";

  return (
    <div className="rounded-2xl border border-edge bg-canvas-soft/40 p-5">
      <div className="flex items-start gap-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber/10">
          <Store className="size-5 text-amber" />
        </div>
        <div className="flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-ink">Marketplace listing</h3>
            <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-ink-faint">
              Private beta
            </span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-ink-soft">
            A <span className="text-ink">blind</span> listing: your trade, region, size bands, and
            the three teaser sections — never your business name or exact figures. Buyers who want
            more go through your NDA gate, so you see exactly who&apos;s looking. The marketplace
            opens to buyers once there are enough listings to be worth their visit.
          </p>

          {listing && (
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-ink-soft sm:grid-cols-4">
              <div><dt className="text-ink-faint">Status</dt><dd className={live ? "text-emerald-400" : "text-ink"}>{live ? "Live" : "Paused"}</dd></div>
              <div><dt className="text-ink-faint">Region</dt><dd>{listing.region}</dd></div>
              <div><dt className="text-ink-faint">Revenue</dt><dd>{listing.revenueBand}</dd></div>
              <div><dt className="text-ink-faint">Team</dt><dd>{listing.employeeBand}</dd></div>
            </dl>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {!live && (
              <Button
                type="button"
                size="sm"
                onClick={() => publish.mutate()}
                disabled={publish.isPending || !mine.data?.canPublish}
                title={mine.data?.canPublish ? undefined : "Publish your profile first"}
              >
                {publish.isPending ? "Listing…" : listing ? "Relist" : "List my business"}
              </Button>
            )}
            {live && (
              <>
                <Button type="button" variant="outline" size="sm" onClick={() => publish.mutate()} disabled={publish.isPending}>
                  {publish.isPending ? "Refreshing…" : "Refresh from profile"}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => pause.mutate()} disabled={pause.isPending}>
                  Pause listing
                </Button>
                {listing?.shareTokenId && (
                  <a
                    href={`/share/${listing.shareTokenId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-amber hover:text-amber-bright"
                  >
                    Buyer's NDA link <ExternalLink className="size-3" />
                  </a>
                )}
              </>
            )}
            {mine.data && !mine.data.canPublish && !listing && (
              <span className="text-xs text-ink-faint">Publish your business profile above to enable this.</span>
            )}
          </div>
          {(publish.error || pause.error) && (
            <p className="mt-2 text-xs text-red-400">{publish.error?.message ?? pause.error?.message}</p>
          )}
          {live && (
            <p className="mt-2 text-[11px] text-ink-faint">
              Tip: your Executive Summary, Overview, and Opportunity sections are shown to buyers.
              Keep your business name out of them if you want to stay anonymous.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

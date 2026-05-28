import { SiteNav } from "@/components/marketing/site-nav";
import { Hero } from "@/components/marketing/hero";
import { Stats } from "@/components/marketing/stats";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { TimelineShowcase } from "@/components/marketing/timeline-showcase";
import { Verticals } from "@/components/marketing/verticals";
import { ClosingCta } from "@/components/marketing/closing-cta";
import { SiteFooter } from "@/components/marketing/site-footer";

export default function HomePage() {
  return (
    <main className="relative">
      <SiteNav />
      <Hero />
      <Stats />
      <HowItWorks />
      <TimelineShowcase />
      <Verticals />
      <ClosingCta />
      <SiteFooter />
    </main>
  );
}

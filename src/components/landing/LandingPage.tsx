import { FooterCta } from "./FooterCta";
import { Hero } from "./Hero";
import { HowItWorks } from "./HowItWorks";
import { LandingHeader } from "./LandingHeader";
import { StatsBand } from "./StatsBand";
import { TrustSection } from "./TrustSection";

/**
 * The public marketing page at "/": hero with the animated commute, how it works, the numbers, why the numbers can be
 * trusted, and a closing call to action. Every "Try the demo" button goes to the demo login.
 */
export function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />
      <main>
        <Hero />
        <HowItWorks />
        <StatsBand />
        <TrustSection />
      </main>
      <FooterCta />
    </div>
  );
}

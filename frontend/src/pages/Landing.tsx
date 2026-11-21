// Public landing page: hero, modules, 3D workflow, live rooms, sign-in, footer. Shown at /login (before sign-in) and /welcome.
import { Hero } from "@/components/landing/Hero";
import { LandingNav } from "@/components/landing/LandingNav";
import { SignInSection } from "@/components/landing/SignInSection";

export default function Landing() {
  return (
    <div className="app-root">
      <LandingNav />
      <main>
        <Hero />
        <SignInSection />
      </main>
    </div>
  );
}

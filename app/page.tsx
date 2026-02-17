import { Navigation } from '@/components/navigation';
import { HeroCarousel } from '@/components/ui/hero-carousel';
import { FeaturedCards } from '@/components/ui/featured-cards';
import { TwoColumnBlock } from '@/components/ui/two-column-block';
import { LandingAboutSection } from '@/components/landing-about-section';
import { LandingAssessmentSection } from '@/components/landing-assessment-section';
import { Footer } from '@/components/footer';

// Force dynamic rendering - this page fetches data from database
export const dynamic = 'force-dynamic';

export default function HomePage() {
  return (
    <div className="min-h-screen flex-col">
      <Navigation />
      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Hero Carousel */}
        <section className="mb-12">
          <HeroCarousel />
        </section>

        {/* Featured Cards */}
        <section className="mb-12">
          <FeaturedCards />
        </section>

        {/* About Sections (Platform, Partnership, Team) */}
        <LandingAboutSection />

        {/* Assessment Section */}
        <LandingAssessmentSection />

        {/* Two Column Block */}
        {/* <section className="mb-12">
          <TwoColumnBlock />
        </section> */}

        {/* Video Highlight */}
        {/* <section className="mb-12">
          <VideoHighlight />
        </section> */}
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}

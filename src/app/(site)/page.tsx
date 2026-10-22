import { CategoryShowcase } from "@/components/home/category-showcase"
import { FeaturedCars } from "@/components/home/featured-cars"
import { FindItFast } from "@/components/home/find-it-fast"
import { HeroSection } from "@/components/home/hero/hero-section"
import { PartsUpgrades } from "@/components/home/parts-upgrades"
import { RacewayTeaser } from "@/components/home/raceway-teaser"
import { StartingGrid } from "@/components/home/starting-grid"
import { TrustStrip } from "@/components/home/trust-strip"

/**
 * Home — e-commerce first (client brief): the logo and a car driving into the
 * foreground, straight into shopping, with the raceway second.
 */
export default function HomePage() {
  return (
    <>
      <HeroSection />
      <TrustStrip />
      <CategoryShowcase />
      <FeaturedCars />
      <StartingGrid />
      <PartsUpgrades />
      <FindItFast />
      <RacewayTeaser />
    </>
  )
}

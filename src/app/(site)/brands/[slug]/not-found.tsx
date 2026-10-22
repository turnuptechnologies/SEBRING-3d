import { ListingNotFound } from "@/components/collection/listing-not-found"
import { brands } from "@/lib/catalog"

export default function BrandNotFound() {
  return (
    <ListingNotFound
      kind="brand"
      destinations={[...brands]
        .filter((b) => b.group === "cars")
        .sort((a, b) => a.name.localeCompare(b.name))
        .slice(0, 8)
        .map((b) => ({ href: `/brands/${b.slug}`, label: b.name, meta: `${b.country} · ${b.scales.join(" / ")}` }))}
    />
  )
}

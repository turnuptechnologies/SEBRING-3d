import { ListingNotFound } from "@/components/collection/listing-not-found"
import { collections } from "@/lib/catalog"

export default function CollectionNotFound() {
  return (
    <ListingNotFound
      kind="collection"
      destinations={collections
        .filter((c) => c.slug !== "all")
        .slice(0, 8)
        .map((c) => ({ href: `/collections/${c.slug}`, label: c.title, meta: c.eyebrow }))}
    />
  )
}

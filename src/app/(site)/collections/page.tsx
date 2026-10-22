import { permanentRedirect } from "next/navigation"

/** /collections has no page of its own — "Shop everything" is the full catalog. */
export default function CollectionsIndex() {
  permanentRedirect("/collections/all")
}

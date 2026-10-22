import { permanentRedirect } from "next/navigation"

/** /products has no listing of its own — the full catalog lives at /collections/all. */
export default function ProductsIndex() {
  permanentRedirect("/collections/all")
}

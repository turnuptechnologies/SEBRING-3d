/**
 * Runs `html` synchronously while the browser parses the server HTML (before
 * first paint). On the client the tag is inert text, so React never warns about
 * rendering a <script> and soft navigations don't re-run it.
 */
export function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

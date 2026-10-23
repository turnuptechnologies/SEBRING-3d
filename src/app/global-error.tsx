"use client"

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: "100vh", display: "grid", placeItems: "center", background: "#0b0b0f", color: "#f3efe6", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ textAlign: "center", padding: 24 }}>
          <p style={{ letterSpacing: "0.24em", fontSize: 11, color: "#ff4b3a", textTransform: "uppercase" }}>Red flag</p>
          <h1 style={{ fontSize: 40, margin: "12px 0 24px", fontWeight: 900 }}>SEBRING</h1>
          <button onClick={() => reset()} style={{ background: "#ffd23f", color: "#0b0b0f", border: 0, padding: "14px 28px", fontWeight: 700, cursor: "pointer" }}>
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}

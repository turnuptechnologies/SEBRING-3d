import { ImageResponse } from "next/og"

import { BADGE_PATH, MARK_PATH } from "@/components/brand/logo"

export const size = { width: 180, height: 180 }
export const contentType = "image/png"

/**
 * Home-screen icon: the volt badge on carbon. The badge stays inside the
 * maskable safe zone (a centred circle of 80% diameter), so the same PNG is
 * listed as the maskable icon in manifest.ts.
 */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0b0b0f",
          backgroundImage: "radial-gradient(circle at 50% 38%, rgba(255, 210, 63, 0.2), rgba(11, 11, 15, 0) 64%)",
        }}
      >
        <svg width="100" height="100" viewBox="2 2 44 44">
          <path d={BADGE_PATH} fill="#ffd23f" />
          <path d={MARK_PATH} fill="none" stroke="#0b0b0f" strokeWidth="7.2" strokeLinecap="round" strokeLinejoin="round" />
          <path d={MARK_PATH} fill="none" stroke="#ffd23f" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      </div>
    ),
    size
  )
}

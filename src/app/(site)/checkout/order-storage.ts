import type { StoredOrder } from "@/app/(site)/checkout/schema"

/*
 * The confirmation page reads the order from sessionStorage: it survives a
 * refresh of the success page, but not a new tab or another device.
 */

const PREFIX = "sebring-order:"
const LAST = `${PREFIX}last`

export function saveOrder(order: StoredOrder) {
  try {
    sessionStorage.setItem(PREFIX + order.orderId, JSON.stringify(order))
    sessionStorage.setItem(LAST, order.orderId)
  } catch {
    // Storage blocked (private mode / quota): the success page shows its "not on this device" state.
  }
}

/** Raw JSON for an order id (or the most recent order) — a stable string for useSyncExternalStore. */
export function readOrderRaw(orderId: string | null): string | null {
  try {
    const id = orderId || sessionStorage.getItem(LAST)
    return id ? sessionStorage.getItem(PREFIX + id) : null
  } catch {
    return null
  }
}

export function parseOrder(raw: string | null): StoredOrder | null {
  if (!raw) return null
  try {
    const order = JSON.parse(raw) as StoredOrder
    return order && typeof order.orderId === "string" && Array.isArray(order.totals?.lines) ? order : null
  } catch {
    return null
  }
}

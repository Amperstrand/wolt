/**
 * Transport-level failure (network down, DNS, timeout). A thrown
 * WoltError (reason "network") means we could not reach the surface;
 * a null return always means the platform answered: absent (unknown
 * slug).
 */
export type WoltFailureReason = "network";

export class WoltError extends Error {
  constructor(readonly reason: WoltFailureReason, message: string) {
    super(message);
    this.name = "WoltError";
  }
}

export function isTransportFailure(error: unknown): boolean {
  return error instanceof Error || typeof DOMException === "function" && error instanceof DOMException;
}

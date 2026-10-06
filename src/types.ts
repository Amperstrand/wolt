export type Slug = string & { readonly __brand: "Slug" };

/** Parse a venue slug: bare slug, or any wolt.com restaurant URL form. */
export function slug(value: string): Slug {
  let candidate = value.trim();
  if (/^https?:\/\//i.test(candidate)) {
    const url = new URL(candidate);
    if (!/(^|\.)wolt\.com$/.test(url.hostname)) {
      throw new Error(`not a wolt.com URL: ${value}`);
    }
    const match = url.pathname.match(/\/restaurant\/([a-z0-9-]+)/i);
    if (match?.[1] === undefined) {
      throw new Error(`no venue slug in URL: ${value}`);
    }
    candidate = match[1];
  }
  if (!/^[a-z0-9][a-z0-9-]{1,}[a-z0-9]$/.test(candidate)) {
    throw new Error(`invalid slug: ${value}`);
  }
  return candidate.toLowerCase() as Slug;
}

export interface Venue {
  readonly id: string;
  readonly slug: Slug;
  readonly name: string;
  readonly address: string | null;
  readonly city: string | null;
  readonly country: string | null;
  readonly currency: string;
  readonly timezone: string;
  /** Wolt's own rating aggregate (score 0-10 + volume). */
  readonly rating: { readonly score: number; readonly volume: number } | null;
  readonly activeMenuId: string | null;
}

/** Live open/close state from the dynamic endpoint (needs no auth). */
export interface VenueStatus {
  readonly slug: Slug;
  readonly isOpen: boolean;
  /** Human status, e.g. "Opens Sunday at 12:00" — the platform's own wording. */
  readonly message: string;
  readonly now: string | null;
  readonly nextOpen: string | null;
  readonly nextClose: string | null;
}

export interface MenuItem {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  /** Price in EUR (cents / 100). */
  readonly price: number;
  /** The raw integer cents as served — Wolt never sends decimal strings. */
  readonly priceCents: number;
}

export interface MenuCategory {
  readonly id: string;
  readonly name: string;
  readonly items: readonly MenuItem[];
}

export interface Menu {
  readonly slug: Slug;
  readonly categories: readonly MenuCategory[];
  readonly itemCount: number;
}

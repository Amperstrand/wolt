import type { Menu, MenuCategory, MenuItem, Slug, Venue, VenueStatus } from "./types.js";

/**
 * Wire shapes. Venue/status: consumer-api.wolt.com (endpoints recovered
 * from OSS — personoids-lite's /v1/pages/search header set,
 * woltcheck's venue static/dynamic URLs; verified live 2026-10-06).
 * Menu: the venue page's dehydrated React-Query state — a
 * `<script type="application/json">` blob whose queries[] carries the
 * `venue-assortment/category-listing` payload. Quirks encoded (each a
 * test + a Lessons line):
 *  - the page carries SEVERAL json script blobs; the menu is found by
 *    queryKey shape, not position.
 *  - prices are INTEGER CENTS at Items[].price (never decimal strings).
 *  - categories join via item_ids (empty categories are served and
 *    must be filtered client-side).
 */
export interface RawStaticVenue {
  readonly venue?: {
    readonly id?: string;
    readonly slug?: string;
    readonly name?: string;
    readonly address?: string;
    readonly city?: string;
    readonly country?: string;
    readonly currency?: string;
    readonly timezone?: string;
    readonly rating?: { readonly score?: string | number; readonly volume?: number };
    readonly delivery_base_price?: number;
    readonly active_menu?: string;
  };
}

export interface RawDynamicVenue {
  readonly venue?: {
    readonly delivery_open_status?: {
      readonly value?: string;
      readonly is_open?: boolean;
      readonly now?: string;
      readonly next_open?: string | null;
      readonly next_close?: string | null;
    };
  };
}

export interface RawDehydratedQuery {
  readonly queryKey?: readonly unknown[];
  readonly state?: { readonly data?: unknown };
}

export interface RawAssortment {
  readonly categories?: readonly {
    readonly id?: string;
    readonly name?: string;
    readonly item_ids?: readonly string[];
  }[];
  readonly items?: readonly {
    readonly id?: string;
    readonly name?: string;
    readonly description?: string | null;
    readonly price?: number;
  }[];
}

export function venueFromStatic(slug: Slug, payload: RawStaticVenue): Venue | null {
  const venue = payload.venue;
  if (venue === undefined || venue.id === undefined) return null;
  const score = venue.rating?.score;
  return {
    id: venue.id,
    slug,
    name: venue.name ?? "",
    address: venue.address ?? null,
    city: venue.city ?? null,
    country: venue.country ?? null,
    currency: venue.currency ?? "EUR",
    timezone: venue.timezone ?? "",
    rating:
      score === undefined || score === null
        ? null
        : { score: Number(score), volume: venue.rating?.volume ?? 0 },
    activeMenuId: venue.active_menu ?? null,
  };
}

export function statusFromDynamic(slug: Slug, payload: RawDynamicVenue): VenueStatus {
  const status = payload.venue?.delivery_open_status;
  return {
    slug,
    isOpen: status?.is_open === true,
    message: status?.value ?? "",
    now: status?.now ?? null,
    nextOpen: status?.next_open ?? null,
    nextClose: status?.next_close ?? null,
  };
}

/** Finds the menu blob among all json scripts by queryKey shape. */
export function assortmentFromHtml(html: string): RawAssortment | null {
  const blobs = html.match(/<script[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/g) ?? [];
  for (const blob of blobs) {
    const body = blob.replace(/<script[^>]*>/, "").replace(/<\/script>/, "");
    let parsed: unknown;
    try {
      parsed = JSON.parse(body);
    } catch {
      continue;
    }
    const queries = (parsed as { readonly queries?: readonly RawDehydratedQuery[] }).queries;
    if (!Array.isArray(queries)) continue;
    for (const query of queries) {
      const key = query.queryKey;
      if (Array.isArray(key) && key[0] === "venue-assortment" && key[1] === "category-listing") {
        const data = query.state?.data;
        if (data !== null && typeof data === "object") {
          return data as RawAssortment;
        }
      }
    }
  }
  return null;
}

export function menuFromAssortment(slug: Slug, assortment: RawAssortment): Menu {
  const itemsById = new Map<string, { item: MenuItem; name: string }>();
  for (const raw of assortment.items ?? []) {
    if (raw.id === undefined) continue;
    const cents = raw.price ?? 0;
    itemsById.set(raw.id, {
      item: {
        id: raw.id,
        name: raw.name ?? "",
        description: raw.description ?? null,
        price: cents / 100,
        priceCents: cents,
      },
      name: raw.name ?? "",
    });
  }

  const categories: MenuCategory[] = [];
  let itemCount = 0;
  for (const category of assortment.categories ?? []) {
    if (category.id === undefined) continue;
    const items: MenuItem[] = [];
    for (const itemId of category.item_ids ?? []) {
      const found = itemsById.get(itemId);
      if (found === undefined) continue;
      items.push(found.item);
      itemCount += 1;
    }
    if (items.length === 0) continue;
    categories.push({ id: category.id, name: category.name ?? category.id, items });
  }

  return { slug, categories, itemCount };
}

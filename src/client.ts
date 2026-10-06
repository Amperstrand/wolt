import { WoltError } from "./error.js";
import { CONSUMER_API, getHtml, getJson, WOLT_ORIGIN } from "./http.js";
import {
  assortmentFromHtml,
  menuFromAssortment,
  statusFromDynamic,
  venueFromStatic,
  type RawDynamicVenue,
  type RawStaticVenue,
} from "./menu.js";
import { slug as parseSlug, type Menu, type Venue, type VenueStatus } from "./types.js";

export interface ClientOptions {
  readonly fetchImpl?: typeof fetch;
  /** Coordinates refine the dynamic status (delivery estimate context). */
  readonly lat?: number;
  readonly lon?: number;
}

/**
 * Read-only Wolt storefront client: venue + live status from
 * consumer-api.wolt.com, menu from the venue page's dehydrated state.
 * A thrown WoltError (reason "network") means unreachable; null means
 * the platform answered: absent (unknown slug).
 */
export class WoltClient {
  constructor(private readonly options: ClientOptions = {}) {}

  async venue(slugOrUrl: string): Promise<Venue | null> {
    const venueSlug = parseSlug(slugOrUrl);
    const result = await getJson<RawStaticVenue>(
      `${CONSUMER_API}/order-xp/web/v1/pages/venue/slug/${venueSlug}/static`,
      this.options.fetchImpl,
    );
    if (!result.ok) {
      if (result.kind === "network") throw new WoltError("network", `venue fetch failed: ${result.body}`);
      return null;
    }
    return venueFromStatic(venueSlug, result.value);
  }

  async status(slugOrUrl: string): Promise<VenueStatus | null> {
    const venueSlug = parseSlug(slugOrUrl);
    const coords =
      this.options.lat !== undefined && this.options.lon !== undefined
        ? `?lat=${this.options.lat}&lon=${this.options.lon}`
        : "";
    const result = await getJson<RawDynamicVenue>(
      `${CONSUMER_API}/order-xp/web/v1/venue/slug/${venueSlug}/dynamic/${coords}`,
      this.options.fetchImpl,
    );
    if (!result.ok) {
      if (result.kind === "network") throw new WoltError("network", `status fetch failed: ${result.body}`);
      return null;
    }
    return statusFromDynamic(venueSlug, result.value);
  }

  async menu(slugOrUrl: string): Promise<Menu | null> {
    const venueSlug = parseSlug(slugOrUrl);
    const page = await getHtml(`${WOLT_ORIGIN}/en/deu/berlin/restaurant/${venueSlug}`, this.options.fetchImpl);
    if (!page.ok) {
      if (page.kind === "network") throw new WoltError("network", `venue page fetch failed: ${page.body}`);
      return null;
    }
    const assortment = assortmentFromHtml(page.html);
    if (assortment === null) return null;
    return menuFromAssortment(venueSlug, assortment);
  }
}

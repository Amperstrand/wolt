export { WoltClient } from "./client.js";
export type { ClientOptions } from "./client.js";
export { WoltError } from "./error.js";
export type { WoltFailureReason } from "./error.js";
export { CONSUMER_API, getHtml, getJson, WOLT_ORIGIN } from "./http.js";
export {
  assortmentFromHtml,
  menuFromAssortment,
  statusFromDynamic,
  venueFromStatic,
} from "./menu.js";
export type { RawAssortment, RawDynamicVenue, RawStaticVenue } from "./menu.js";
export { slug } from "./types.js";
export type { Menu, MenuCategory, MenuItem, Slug, Venue, VenueStatus } from "./types.js";
export const PLATFORM = "wolt";

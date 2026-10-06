/**
 * SYNTHETIC Wolt transport. Every slug, id, price and rating below is
 * invented — nothing is a captured payload. The fixture mirrors the
 * SHAPE of the two read surfaces (platform-recon
 * research/order-bridges/REPORT.md):
 *
 *  - consumer-api.wolt.com venue static/dynamic (endpoints recovered
 *    from OSS: personoids-lite's header set, woltcheck's URLs) — plain
 *    JSON GETs, unknown slugs 404 with a JSON error body.
 *  - the venue page is a multi-blob document: a config json script
 *    FIRST, then the dehydrated React-Query state carrying several
 *    queries — the menu parser must find `venue-assortment/
 *    category-listing` BY QUERY-KEY SHAPE, not position.
 *  - prices are integer cents at items[].price.
 *  - empty categories are served (client filters); item_ids join may
 *    reference unknown items (client drops).
 */
import { bodyOf, headerRecord, jsonResponse, type RecordedRequest } from "./transport-fake.js";

export const CONSUMER_API = "https://consumer-api.wolt.com";
export const WOLT_ORIGIN = "https://wolt.com";
export const LIVE_SLUG = "synthetic-pier-bistro";
export const CLOSED_SLUG = "synthetic-night-kitchen";
export const UNKNOWN_SLUG = "synthetic-no-such-venue";

const CATEGORY_FULL = "cat-0001";
const CATEGORY_EMPTY = "cat-0002";

function dehydratedPage(slugKey: string, closed: boolean): string {
  const state = {
    mutations: [],
    queries: [
      { queryKey: ["venue", "static", slugKey, "en"], state: { data: { venue: { name: "ignored" } } } },
      {
        queryKey: ["venue-assortment", "category-listing", slugKey, null, null, "en", "no-user"],
        state: {
          data: {
            assortment_id: "synthetic-assortment",
            categories: [
              { id: CATEGORY_FULL, name: "Pier Classics", item_ids: ["it-1", "it-2", "it-missing"] },
              { id: CATEGORY_EMPTY, name: "Empty Card", item_ids: [] },
            ],
            items: [
              { id: "it-1", name: "Synthetic Fish Roll", description: "Invented bun", price: 890 },
              { id: "it-2", name: "Synthetic Fries Basket", description: null, price: 450 },
            ],
          },
        },
      },
    ],
  };
  const config = { NODE_ENV: "production", RESTAURANT_API_END_POINT: "https://restaurant-api.example.test" };
  return [
    "<!doctype html><html><head><title>Synthetic</title></head><body>",
    `<script type="application/json">${JSON.stringify(config)}</script>`,
    `<script type="application/json">${JSON.stringify(state)}</script>`,
    `<script>window.__BOOTSTRAP__ = ${JSON.stringify({ slug: slugKey, closed })};</script>`,
    "</body></html>",
  ].join("");
}

export function fakeWolt(): {
  readonly fetchImpl: typeof fetch;
  readonly requests: readonly RecordedRequest[];
} {
  const requests: RecordedRequest[] = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    const url = new URL(String(input));
    const method = (init?.method ?? "GET").toUpperCase();
    requests.push({ method, url: url.toString(), headers: headerRecord(init), body: bodyOf(init) });

    const staticMatch = url.pathname.match(/^\/order-xp\/web\/v1\/pages\/venue\/slug\/([a-z0-9-]+)\/static$/);
    if (url.hostname === "consumer-api.wolt.com" && staticMatch?.[1] !== undefined) {
      if (staticMatch[1] === UNKNOWN_SLUG) {
        return jsonResponse({ msg: "venue not found" }, {}, 404);
      }
      const closed = staticMatch[1] === CLOSED_SLUG;
      return jsonResponse({
        venue: {
          id: `synthid-${staticMatch[1].length}`,
          slug: staticMatch[1],
          name: closed ? "Synthetic Night Kitchen" : "Synthetic Pier Bistro",
          address: "1 Synthetic Pier",
          city: "Berlin",
          country: "DEU",
          currency: "EUR",
          timezone: "Europe/Berlin",
          rating: { score: "8.4", volume: 21 },
          active_menu: "synthetic-menu-id",
        },
      });
    }

    const dynamicMatch = url.pathname.match(/^\/order-xp\/web\/v1\/venue\/slug\/([a-z0-9-]+)\/dynamic\/?$/);
    if (url.hostname === "consumer-api.wolt.com" && dynamicMatch?.[1] !== undefined) {
      if (dynamicMatch[1] === UNKNOWN_SLUG) {
        return jsonResponse({ msg: "venue not found" }, {}, 404);
      }
      const closed = dynamicMatch[1] === CLOSED_SLUG;
      return jsonResponse({
        venue: {
          delivery_open_status: {
            value: closed ? "Opens Monday at 12:00" : "Open now",
            is_open: !closed,
            now: "2026-10-06T17:01:36.493736+02:00",
            next_open: closed ? "2026-10-12T12:00:00+02:00" : null,
            next_close: closed ? "2026-10-12T21:00:00+02:00" : "2026-10-06T22:00:00+02:00",
          },
        },
      });
    }

    const pageMatch = url.pathname.match(/\/restaurant\/([a-z0-9-]+)$/);
    if (url.hostname === "wolt.com" && pageMatch?.[1] !== undefined) {
      if (pageMatch[1] === UNKNOWN_SLUG) {
        return new Response("<html>not found</html>", { status: 404 });
      }
      return new Response(dehydratedPage(pageMatch[1], pageMatch[1] === CLOSED_SLUG), {
        status: 200,
        headers: { "content-type": "text/html; charset=UTF-8" },
      });
    }

    return jsonResponse({ msg: `unrouted ${url.hostname}${url.pathname}` }, {}, 404);
  };
  return { fetchImpl, requests };
}

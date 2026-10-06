import { describe, expect, it } from "vitest";
import { WoltClient, WoltError } from "../src/index.js";
import { slug } from "../src/types.js";
import { fakeWolt, CLOSED_SLUG, LIVE_SLUG, UNKNOWN_SLUG } from "./wolt-fake.js";
import { sent } from "./transport-fake.js";

function client(fetchImpl: typeof fetch): WoltClient {
  return new WoltClient({ fetchImpl });
}

describe("slug", () => {
  it("accepts bare slugs and wolt.com restaurant URLs", () => {
    expect(slug("brlo-brwhouse")).toBe("brlo-brwhouse");
    expect(slug("https://wolt.com/de/deu/berlin/restaurant/brlo-brwhouse")).toBe("brlo-brwhouse");
    expect(slug("https://restaurant.wolt.com/en/restaurant/some-venue")).toBe("some-venue");
    expect(() => slug("https://example.test/restaurant/x")).toThrow(/wolt\.com/);
    expect(() => slug("https://wolt.com/en/berlin")).toThrow(/slug/);
    expect(() => slug("Bad Slug!")).toThrow(/invalid slug/);
  });
});

describe("venue", () => {
  it("reads the venue record from the consumer API static endpoint", async () => {
    const { fetchImpl } = fakeWolt();
    const venue = await client(fetchImpl).venue(LIVE_SLUG);
    expect(venue).toMatchObject({
      name: "Synthetic Pier Bistro",
      address: "1 Synthetic Pier",
      city: "Berlin",
      currency: "EUR",
      activeMenuId: "synthetic-menu-id",
    });
    expect(venue?.rating).toEqual({ score: 8.4, volume: 21 });
  });

  it("returns null for an unknown slug (JSON 404 is absence)", async () => {
    const { fetchImpl } = fakeWolt();
    expect(await client(fetchImpl).venue(UNKNOWN_SLUG)).toBeNull();
  });

  it("throws a typed network error when the transport dies", async () => {
    const dead: typeof fetch = (async () => {
      throw new TypeError("fetch failed");
    }) as typeof fetch;
    await expect(client(dead).venue(LIVE_SLUG)).rejects.toMatchObject({
      name: "WoltError",
      reason: "network",
    });
  });
});

describe("status", () => {
  it("reads live open state with the platform's own wording", async () => {
    const { fetchImpl } = fakeWolt();
    const open = await client(fetchImpl).status(LIVE_SLUG);
    expect(open).toMatchObject({ isOpen: true, message: "Open now" });
    expect(open?.nextClose).toBe("2026-10-06T22:00:00+02:00");

    const closed = await client(fetchImpl).status(CLOSED_SLUG);
    expect(closed).toMatchObject({ isOpen: false, message: "Opens Monday at 12:00" });
    expect(closed?.nextOpen).toBe("2026-10-12T12:00:00+02:00");
  });

  it("appends coordinates to the dynamic call when provided", async () => {
    const { fetchImpl, requests } = fakeWolt();
    await new WoltClient({ fetchImpl, lat: 52.5, lon: 13.4 }).status(LIVE_SLUG);
    const call = requests.find((request) => request.url.includes("/dynamic/"));
    expect(call?.url).toContain("lat=52.5");
    expect(call?.url).toContain("lon=13.4");
  });
});

describe("menu", () => {
  it("extracts the assortment from the dehydrated page by query-key shape", async () => {
    const { fetchImpl } = fakeWolt();
    const menu = await client(fetchImpl).menu(LIVE_SLUG);
    expect(menu?.categories.map((category) => category.name)).toEqual(["Pier Classics"]);
    const items = menu?.categories[0]?.items ?? [];
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      name: "Synthetic Fish Roll",
      description: "Invented bun",
      price: 8.9,
      priceCents: 890,
    });
    expect(items[1]).toMatchObject({ name: "Synthetic Fries Basket", price: 4.5, priceCents: 450 });
    expect(menu?.itemCount).toBe(2);
  });

  it("drops empty categories and dangling item_ids (served, filtered)", async () => {
    const { fetchImpl } = fakeWolt();
    const menu = await client(fetchImpl).menu(LIVE_SLUG);
    expect(menu?.categories.some((category) => category.name === "Empty Card")).toBe(false);
    const names = menu?.categories.flatMap((category) => category.items.map((item) => item.name)) ?? [];
    expect(names).not.toContain("it-missing");
  });

  it("returns null for an unknown slug page (404) and for pages without a menu blob", async () => {
    const { fetchImpl } = fakeWolt();
    expect(await client(fetchImpl).menu(UNKNOWN_SLUG)).toBeNull();
  });

  it("throws a typed network error mid-chain when the transport dies", async () => {
    const dead: typeof fetch = (async () => {
      throw new TypeError("fetch failed");
    }) as typeof fetch;
    await expect(client(dead).menu(LIVE_SLUG)).rejects.toBeInstanceOf(WoltError);
  });
});

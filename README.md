# wolt

Read-only Wolt storefront client. Venue records + live open/close
status from `consumer-api.wolt.com` (plain JSON GETs — endpoints
recovered from OSS: personoids-lite's working header set,
woltcheck's venue URLs; verified live), and the full priced menu from
the venue page's dehydrated React-Query state.

Read-only by design: **no baskets, no orders, no payment**.

```sh
npm install github:Amperstrand/wolt
```

```ts
import { WoltClient } from "wolt";

const client = new WoltClient({ lat: 52.5, lon: 13.39 });
const venue = await client.venue("brlo-brwhouse");     // record + rating
const status = await client.status("brlo-brwhouse");   // live open/close + schedule
const menu = await client.menu("brlo-brwhouse");       // priced catalog (cents-exact)
```

CLI (Node 22+):

```sh
npx wolt health brlo-brwhouse    # exit 1 when closed
npx wolt menu brlo-brwhouse
```

## Error semantics

A thrown `WoltError` (reason `"network"`) means the surface was
unreachable. A `null` return always means the platform answered:
absent (unknown slug).

## What the client encodes

- Menu extraction finds the `venue-assortment/category-listing`
  dehydrated query **by query-key shape**, not script position — the
  page carries several JSON blobs (config first, state second, but the
  client does not depend on order).
- Prices are **integer cents** at `items[].price` — Wolt never sends
  decimal strings; the model exposes both `price` (EUR) and
  `priceCents` (raw).
- Categories join via `item_ids`; empty categories are served and
  filtered client-side; dangling ids are dropped.
- Status wording (`"Opens Sunday at 12:00"`) is the platform's own;
  `next_open`/`next_close` timestamps ride inside
  `delivery_open_status` (learned live: the parser first read the
  wrong branch and got nulls — the live check caught it).
- `delivery_base_price` is NOT surfaced: the live value's units were
  ambiguous (99 — cents or value), so the field stays out of the
  model rather than guessed.

## Payments lane (out of scope — documented, not implemented)

Wolt is a **marketplace, not a payment pipe to the venue**: the guest
pays *Wolt* (Wolt's own checkout: card, Apple/Google Pay, Wolt
credits), Wolt deducts its commission and remits the balance to the
restaurant on a payout cycle. The restaurant never sees a card. Menu
*data* may originate from the venue's POS via a bridge (Deliverect et
al — see the platform-recon order-bridges lane), but the *money* flows
guest → Wolt → (commission) → venue. That is also why aggregator
prices differ from POS prices by design (measured at BRLO: commodities
byte-identical, house items ±). If an order lane is ever staged, it
ends at a CheckoutHandoff to Wolt's own checkout — a person pays with
their own card there; no card data ever transits this client. The
read-only package has no order command on purpose.

## Verification (live, 2026-10-06)

- **BRLO Chicken & Beer Gleisdreieck** (`brlo-brwhouse`): venue
  record (id, rating 6.8, EUR, Europe/Berlin), live status ("Opens
  Sunday at 12:00", next open 2026-10-11T12:00+02:00), menu 38 items /
  11 categories in 0.8 s — prices cents-exact (e.g. Crispy Fried
  Chicken small 1450 → €14.50).

## Repo rules

Public repo — never commit captured payloads, cookies, or personal
data; fakes are synthetic with provenance comments. Commit via
`sh scripts/git-commit.sh`; CI runs the leak scan plus typecheck,
build, and the offline test suite. Quirk→lesson log:
[prompts/write-tests.md](prompts/write-tests.md).

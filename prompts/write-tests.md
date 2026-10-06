---
description: Write the client test suite for a venue API. Fake the transport, encode the quirks, feed the lessons back.
---

Write tests for CLIENT against PLATFORM. The suite must pass offline, prove
the wire contract, and stay leak-gate clean.

## Principles

1. **Test through the public methods.** Inject the transport
   (`fetchImpl`). Never mock client internals.
2. **The fake is a router, not a per-test mock.** One factory that
   routes URLs and records every request.
3. **One describe per endpoint, one test per documented quirk.**
4. **Encode surface semantics in the fake, not the test.** The venue
   page fake carries MULTIPLE json script blobs in a realistic order —
   position-dependent parsers fail naturally.
5. **Synthetic fixtures only.** Invented slugs, ids, prices; RFC 2606
   `example` hosts; provenance comments.

## Lessons (append-only)

- Wolt serves three read surfaces with different shapes: consumer-API
  static (venue record), consumer-API dynamic (live status — plain
  JSON, no auth), and the venue PAGE (1.7 MB HTML whose dehydrated
  React-Query state carries the menu). A client that mixes them up
  parses the wrong thing; the fake must route all three.
- The dehydrate parser must find the assortment BY QUERY-KEY SHAPE
  (`venue-assortment/category-listing`) — the page has several json
  blobs (config, state, chunk maps) and their order is not a contract.
- Wolt prices are integer cents, never decimal strings — the exact
  inverse of the GastroNova/Lieferando string-decimal quirks. Surface
  the raw cents alongside the EUR float.
- `delivery_open_status.next_open/next_close` live INSIDE the status
  object, not under `venue_raw.delivery_specs.delivery_times`. The
  wrong-branch version typechecks fine and returns nulls — only a
  live read catches it. Pin the field path in a test.
- Ambiguous-unit fields stay OUT of the model: `delivery_base_price`
  served 99 (cents? value?) — exposing it invites a wrong display.
  Model fields carry verified units or nothing.
- Empty categories are SERVED (11 categories at BRLO, one empty) and
  dangling `item_ids` exist — the fake needs both or the filters are
  untested theater.

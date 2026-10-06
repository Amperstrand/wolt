# AGENTS.md — contributing to wolt

Read-only Wolt storefront client: venue + status from
consumer-api.wolt.com (endpoints recovered from OSS), menu from the
venue page's dehydrated state. Surface notes live in the private
platform-recon repo's `research/order-bridges/REPORT.md`.

Rules:
- READ-ONLY: no baskets, no orders, no payment. Wolt checkout is a
  hosted payment flow a person opens (see README "Payments lane").
- This repository is public. Never commit card numbers, HAR/pcap/log
  files, cookies, session dumps, captured payloads, or personal data.
  Fakes are synthetic with provenance comments. Commit via
  `sh scripts/git-commit.sh`; CI runs the leak scan.
- Tests are offline against a synthetic fake that encodes the surface
  quirks (multi-blob dehydrate, cents pricing, query-key selection,
  empty categories, status field paths).

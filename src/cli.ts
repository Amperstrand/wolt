#!/usr/bin/env node
import { realpathSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { WoltClient } from "./client.js";
import type { Menu, Venue, VenueStatus } from "./types.js";

/**
 * Read-only CLI: `wolt health <slug>`, `wolt menu <slug>`.
 * No order command by design — Wolt checkout is a hosted payment flow
 * a person opens (see README, "Payments lane").
 */
export interface CliPorts {
  readonly out: (line: string) => void;
  readonly err: (line: string) => void;
  readonly fetchImpl?: typeof fetch;
}

const USAGE = `wolt — read-only Wolt storefront client

commands:
  health <slug>    venue record + live open/close status (consumer API)
  menu <slug>      full priced menu from the venue page's dehydrated state

<slug> is the venue slug or any wolt.com restaurant URL. Menu reads for
bare slugs use the Berlin path prefix — pass a full URL for other cities.
No order command exists by design.`;

function processPorts(): CliPorts {
  return {
    out: (line) => process.stdout.write(`${line}\n`),
    err: (line) => process.stderr.write(`${line}\n`),
  };
}

function printVenue(venue: Venue, status: VenueStatus | null, out: (line: string) => void): void {
  out(`${venue.name} (${venue.id})`);
  out(`  address:   ${venue.address ?? "?"}, ${venue.city ?? "?"} (${venue.country ?? "?"})`);
  out(`  currency:  ${venue.currency} · rating ${venue.rating ? `${venue.rating.score}/10 (${venue.rating.volume})` : "none"}`);
  if (status !== null) {
    out(`  open:      ${status.isOpen ? "OPEN now" : "closed"} — ${status.message || "no wording"}`);
    if (status.nextOpen !== null) out(`  next open: ${status.nextOpen} → close ${status.nextClose ?? "?"}`);
  }
}

function printMenu(menu: Menu, out: (line: string) => void): void {
  out(`${menu.slug} — ${menu.itemCount} items, ${menu.categories.length} categories`);
  for (const category of menu.categories) {
    out(category.name);
    for (const item of category.items) {
      out(`  ${item.name}  ${item.price.toFixed(2)} EUR`);
    }
  }
}

export async function runCli(
  argv: readonly string[],
  ports: CliPorts = processPorts(),
): Promise<0 | 1> {
  const [command, target] = argv;
  if (command === undefined || command === "help" || command === "-h" || command === "--help") {
    ports.out(USAGE);
    return 0;
  }
  if (command !== "health" && command !== "menu") {
    ports.err(`unknown command: ${command}`);
    ports.err(USAGE);
    return 1;
  }
  if (target === undefined) {
    ports.err(`${command} needs a venue slug or wolt.com URL`);
    return 1;
  }
  const client = new WoltClient(ports.fetchImpl === undefined ? {} : { fetchImpl: ports.fetchImpl });
  try {
    if (command === "health") {
      const venue = await client.venue(target);
      if (venue === null) {
        ports.err(`no venue for ${target}`);
        return 1;
      }
      const status = await client.status(target);
      printVenue(venue, status, ports.out);
      return status?.isOpen === true ? 0 : 1;
    }
    const menu = await client.menu(target);
    if (menu === null) {
      ports.err(`no menu for ${target}`);
      return 1;
    }
    printMenu(menu, ports.out);
    return 0;
  } catch (error) {
    ports.err(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

// npm installs the bin as a .bin symlink while Node realpaths the ESM
// entry — compare resolved paths or the CLI silently no-ops for consumers.
function invokedAsScript(): boolean {
  if (process.argv[1] === undefined) return false;
  try {
    return import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href;
  } catch {
    return false;
  }
}

if (invokedAsScript()) {
  process.exit(await runCli(process.argv.slice(2)));
}

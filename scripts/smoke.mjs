#!/usr/bin/env node
/**
 * Weekly smoke: read-only venue checks against the consumer API and
 * the dehydrated venue page. Exit 1 on drift, unknown slugs, transport
 * failure.
 */
import { WoltClient } from "../dist/index.js";

const WORKED_EXAMPLES = [
  { slug: "brlo-brwhouse", name: "BRLO Chicken & Beer Gleisdreieck (Berlin)" },
  { slug: "hasir-kreuzberg", name: "Hasir Kreuzberg (Berlin) — bridge-era classic" },
];

const client = new WoltClient();
let failed = false;

for (const example of WORKED_EXAMPLES) {
  try {
    const venue = await client.venue(example.slug);
    if (venue === null) {
      console.error(`smoke fail ${example.slug} (${example.name}): venue answered absent`);
      failed = true;
      continue;
    }
    const status = await client.status(example.slug);
    console.log(
      `smoke pass ${example.slug}: ${venue.name} id=${venue.id} rating=${venue.rating?.score ?? "?"} open=${status?.isOpen ?? "?"}`,
    );
  } catch (error) {
    console.error(`smoke fail ${example.slug} (${example.name}): ${error instanceof Error ? error.message : String(error)}`);
    failed = true;
  }
}

try {
  const menu = await client.menu("brlo-brwhouse");
  if (menu === null || menu.itemCount === 0) {
    console.error(`smoke fail menu read: ${menu === null ? "null" : "zero items"}`);
    failed = true;
  } else {
    console.log(`smoke pass menu read: ${menu.itemCount} items, ${menu.categories.length} categories`);
  }
} catch (error) {
  console.error(`smoke fail menu read: ${error instanceof Error ? error.message : String(error)}`);
  failed = true;
}

process.exit(failed ? 1 : 0);

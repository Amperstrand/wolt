import { describe, expect, it } from "vitest";
import { runCli } from "../src/cli.js";
import { fakeWolt, CLOSED_SLUG, LIVE_SLUG } from "./wolt-fake.js";

function ports(lines: string[], errors: string[]) {
  return {
    out: (line: string) => lines.push(line),
    err: (line: string) => errors.push(line),
  };
}

describe("runCli", () => {
  it("health prints the venue + live status, exit 0 when open", async () => {
    const transport = fakeWolt();
    const lines: string[] = [];
    const code = await runCli(["health", LIVE_SLUG], { ...ports(lines, []), fetchImpl: transport.fetchImpl });
    expect(code).toBe(0);
    const text = lines.join("\n");
    expect(text).toContain("Synthetic Pier Bistro");
    expect(text).toContain("Open now");
    expect(text).toContain("8.4/10 (21)");
  });

  it("health exits 1 when the venue is closed, with the platform wording", async () => {
    const transport = fakeWolt();
    const lines: string[] = [];
    const code = await runCli(["health", CLOSED_SLUG], { ...ports(lines, []), fetchImpl: transport.fetchImpl });
    expect(code).toBe(1);
    expect(lines.join("\n")).toContain("Opens Monday at 12:00");
  });

  it("menu prints prices from the dehydrated assortment", async () => {
    const transport = fakeWolt();
    const lines: string[] = [];
    const code = await runCli(["menu", LIVE_SLUG], { ...ports(lines, []), fetchImpl: transport.fetchImpl });
    expect(code).toBe(0);
    expect(lines.join("\n")).toContain("Synthetic Fish Roll  8.90 EUR");
    expect(lines.join("\n")).toContain("Pier Classics");
  });

  it("accepts full wolt.com URLs and exits 1 on unknown slugs", async () => {
    const transport = fakeWolt();
    const lines: string[] = [];
    const code = await runCli(
      ["menu", `https://wolt.com/de/deu/berlin/restaurant/${LIVE_SLUG}`],
      { ...ports(lines, []), fetchImpl: transport.fetchImpl },
    );
    expect(code).toBe(0);
    expect(lines.join("\n")).toContain("Pier Classics");

    const errors: string[] = [];
    expect(await runCli(["menu", "!!"], ports([], errors))).toBe(1);
    expect(errors[0]).toContain("invalid slug");
  });

  it("rejects order commands by design", async () => {
    const errors: string[] = [];
    expect(await runCli(["order", LIVE_SLUG], ports([], errors))).toBe(1);
    expect(errors[0]).toContain("unknown command: order");
  });
});

import { describe, it, expect } from "vitest";
import { sha256Hex } from "@/lib/rate-limit";
import {
  isMarketplaceOpen,
  revenueBand,
  employeeBand,
  readinessBand,
  regionFromLocation,
  listingHeadline,
} from "@/lib/marketplace";

describe("marketplace visibility gate", () => {
  it("is open to everyone when the flag is on", async () => {
    expect(await isMarketplaceOpen({ MARKETPLACE_ENABLED: "on" }, null)).toBe(true);
  });
  it("is closed to the public when the flag is off", async () => {
    expect(await isMarketplaceOpen({ MARKETPLACE_ENABLED: "off", SUPER_ADMIN_TOKEN: "s" }, null)).toBe(false);
    expect(await isMarketplaceOpen({ SUPER_ADMIN_TOKEN: "s" }, "session=abc")).toBe(false);
  });
  it("lets a signed-in superadmin preview while off (cookie = sha256 of the token)", async () => {
    const good = await sha256Hex("admin-secret");
    expect(await isMarketplaceOpen({ SUPER_ADMIN_TOKEN: "admin-secret" }, `foo=1; sa_token=${good}`)).toBe(true);
    expect(await isMarketplaceOpen({ SUPER_ADMIN_TOKEN: "admin-secret" }, `sa_token=admin-secret`)).toBe(false); // raw token never works
    expect(await isMarketplaceOpen({ SUPER_ADMIN_TOKEN: "admin-secret" }, `sa_token=${await sha256Hex("other")}`)).toBe(false);
  });
});

describe("blind-listing bands", () => {
  it("maps revenue to ranges and never leaks the exact figure", () => {
    expect(revenueBand(null)).toBe("Undisclosed");
    expect(revenueBand(0)).toBe("Undisclosed");
    expect(revenueBand(120_000)).toBe("Under $500K");
    expect(revenueBand(750_000)).toBe("$500K–$1M");
    expect(revenueBand(2_499_999)).toBe("$1M–$2.5M");
    expect(revenueBand(6_240_000)).toBe("$5M–$10M");
    expect(revenueBand(40_000_000)).toBe("$10M+");
  });
  it("maps employees and readiness", () => {
    expect(employeeBand(undefined)).toBe("Undisclosed");
    expect(employeeBand(3)).toBe("1–5 employees");
    expect(employeeBand(31)).toBe("16–50 employees");
    expect(readinessBand(null)).toBe("Getting started");
    expect(readinessBand(64)).toBe("Documented");
    expect(readinessBand(82)).toBe("Well documented");
  });
  it("keeps the region but drops the city (city + trade can identify a shop)", () => {
    expect(regionFromLocation("Akron, Ohio")).toBe("Ohio");
    expect(regionFromLocation("Ohio")).toBe("Ohio");
    expect(regionFromLocation("")).toBe("Undisclosed");
    expect(regionFromLocation(null)).toBe("Undisclosed");
  });
  it("builds a headline without the business name", () => {
    const h = listingHeadline("manufacturing", "Ohio", new Date().getFullYear() - 38);
    expect(h).toBe("38-year machine shop / manufacturing business in Ohio");
    expect(listingHeadline("hvac", "Undisclosed", null)).toBe("Hvac business");
  });
});

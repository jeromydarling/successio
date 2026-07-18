import { describe, it, expect } from "vitest";
import { parseLenientExtraction } from "@/server/workers/extract";

describe("parseLenientExtraction", () => {
  it("keeps valid items and drops malformed ones instead of failing everything", () => {
    // The exact prod failure: a financials entry without a year alongside
    // three perfectly good customers.
    const raw = {
      document_type_detected: "customer_list",
      customers: [
        { name: "Goodyear Tire", revenue_share: 0.5, contract_status: "active", confidence: 0.9 },
        { name: "Parker Hannifin", confidence: 0.85 },
        { name: "Timken", contract_status: "month-to-month", confidence: 0.8 },
      ],
      financials: [{ revenue: 1_750_000, confidence: 0.6 }], // no year → dropped
    };
    const out = parseLenientExtraction(raw);
    expect(out.customers).toHaveLength(3);
    expect(out.financials).toHaveLength(0);
    expect(out.document_type_detected).toBe("customer_list");
  });

  it("tolerates missing or non-array entity fields", () => {
    const out = parseLenientExtraction({ summary: "just a summary" });
    expect(out.customers).toEqual([]);
    expect(out.summary).toBe("just a summary");
  });

  it("throws only on non-object output (triggering the model fallback chain)", () => {
    expect(() => parseLenientExtraction("not json object")).toThrow();
    expect(() => parseLenientExtraction(null)).toThrow();
  });

  it("drops items with invalid enum values but keeps siblings", () => {
    const out = parseLenientExtraction({
      equipment: [
        { name: "CNC Lathe", condition: "good", confidence: 0.9 },
        { name: "Old Mill", condition: "rusty", confidence: 0.9 }, // invalid enum
      ],
    });
    expect(out.equipment).toHaveLength(1);
    expect(out.equipment![0].name).toBe("CNC Lathe");
  });
});

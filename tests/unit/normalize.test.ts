import { describe, expect, it } from "vitest";
import {
  parseAreaUnit,
  parseDate,
  parseImageUrls,
  parseInr,
  parseListingId,
  parseListingStatus,
  parsePincode,
  parsePropertyType,
  parseState,
  parseTransactionType,
  toIstDateString,
} from "@/lib/listings/normalize";

const v = <T>(r: { ok: true; value: T } | { ok: false; error: string }) => {
  if (!r.ok) throw new Error(r.error);
  return r.value;
};

describe("parseInr", () => {
  it.each([
    ["12500000", 12_500_000],
    ["1,25,00,000", 12_500_000],
    ["₹ 1.25 Cr", 12_500_000],
    ["1.25 crore", 12_500_000],
    ["45 Lakh", 4_500_000],
    ["45 lac", 4_500_000],
    ["45L", 4_500_000],
    ["Rs. 25,000/month", 25_000],
    ["25k", 25_000],
    ["INR 32,000 per month", 32_000],
    ["₹ 85,00,000/-", 8_500_000],
  ])("parses %s", (input, expected) => {
    expect(v(parseInr(input))).toBe(expected);
  });
  it("treats price on request as null", () => {
    expect(v(parseInr("Price on request"))).toBeNull();
    expect(v(parseInr("POR"))).toBeNull();
  });
  it("rejects garbage, zero and blanks", () => {
    expect(parseInr("abc").ok).toBe(false);
    expect(parseInr("0").ok).toBe(false);
    expect(parseInr("").ok).toBe(false);
    expect(parseInr("12 apples").ok).toBe(false);
  });
});

describe("enumerations", () => {
  it("maps synonyms", () => {
    expect(v(parseTransactionType("Resale"))).toBe("sale");
    expect(v(parseTransactionType("Lease"))).toBe("rent");
    expect(v(parsePropertyType("Flat"))).toBe("apartment");
    expect(v(parsePropertyType("Godown"))).toBe("warehouse");
    expect(v(parsePropertyType("Office Space"))).toBe("office");
    expect(v(parseListingStatus("Available"))).toBe("active");
    expect(v(parseListingStatus("Under Offer"))).toBe("under_offer");
    expect(v(parseListingStatus("Withdrawn"))).toBe("archived");
    expect(v(parseAreaUnit("Sq. Ft."))).toBe("sqft");
    expect(v(parseAreaUnit("gaj"))).toBe("sqyd");
    expect(v(parseAreaUnit("m²"))).toBe("sqm");
  });
  it("rejects state-specific units", () => {
    const r = parseAreaUnit("Bigha");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/varies between states/);
  });
  it("rejects unknown values with a helpful list", () => {
    const r = parsePropertyType("Spaceship");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/apartment/);
  });
  it("normalises states", () => {
    expect(v(parseState("MH")).value).toBe("Maharashtra");
    expect(v(parseState("uttar pradesh")).value).toBe("Uttar Pradesh");
    expect(v(parseState("Orissa")).value).toBe("Odisha");
    expect(v(parseState("Atlantis")).recognised).toBe(false);
  });
});

describe("identifiers", () => {
  it("normalises listing ids", () => {
    expect(v(parseListingId(" ska-1001 "))).toBe("SKA-1001");
    expect(v(parseListingId("1001"))).toBe("1001");
    expect(parseListingId("bad/id").ok).toBe(false);
  });
  it("validates PIN codes", () => {
    expect(v(parsePincode("411 045"))).toBe("411045");
    expect(v(parsePincode("411045.0"))).toBe("411045");
    expect(parsePincode("011045").ok).toBe(false);
    expect(parsePincode("4110").ok).toBe(false);
  });
});

describe("parseDate", () => {
  it("reads day-first Indian dates in IST", () => {
    expect(toIstDateString(v(parseDate("25-10-2026", "d"))!)).toBe("2026-10-25");
    expect(toIstDateString(v(parseDate("05/11/2026", "d"))!)).toBe("2026-11-05");
    expect(toIstDateString(v(parseDate("2026-10-25", "d"))!)).toBe("2026-10-25");
    expect(toIstDateString(v(parseDate("25 Oct 2026", "d"))!)).toBe("2026-10-25");
    expect(toIstDateString(v(parseDate("46320", "d"))!)).toBe("2026-10-25");
  });
  it("rejects impossible dates", () => {
    expect(parseDate("31-02-2026", "d").ok).toBe(false);
    expect(parseDate("someday", "d").ok).toBe(false);
  });
});

describe("parseImageUrls", () => {
  it("splits, converts Drive links and rejects http", () => {
    const r = parseImageUrls(
      "https://cdn.example.com/a.jpg | https://drive.google.com/file/d/1AbCdEfGhIjKlMnOp/view?usp=sharing\nhttp://insecure.example.com/b.jpg",
    );
    expect(r.urls).toEqual(["https://cdn.example.com/a.jpg", "https://lh3.googleusercontent.com/d/1AbCdEfGhIjKlMnOp"]);
    expect(r.errors[0]).toMatch(/https/);
  });
  it("keeps commas inside URLs (e.g. Cloudinary transforms)", () => {
    const r = parseImageUrls("https://res.cloudinary.com/x/image/upload/w_800,h_600/a.jpg, https://res.cloudinary.com/x/b.jpg");
    expect(r.urls).toHaveLength(2);
    expect(r.urls[0]).toContain("w_800,h_600");
  });
});

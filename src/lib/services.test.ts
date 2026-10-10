import { describe, expect, it } from "vitest";
import { SERVICE_IDS } from "./domain";
import { HOTELS } from "./hotels";
import { STRINGS } from "./i18n";
import {
  bookedItemLabel,
  canonicalServiceName,
  isServiceId,
  serviceDescription,
  servicePrice,
} from "./services";

const london = HOTELS["kensington-house"];
const barcelona = HOTELS["casa-mar"];

describe("hotel services", () => {
  it("every hotel offers every known service with unique ids", () => {
    for (const hotel of Object.values(HOTELS)) {
      expect(hotel.services.map((s) => s.id).sort()).toEqual([...SERVICE_IDS].sort());
    }
  });

  it("canonical names are the English names", () => {
    expect(canonicalServiceName("spa-treatment")).toBe("Spa treatment");
  });

  it("describes the airport transfer with the hotel's airport", () => {
    expect(serviceDescription(STRINGS.en, "airport-transfer", london)).toContain("Heathrow");
    expect(serviceDescription(STRINGS.en, "airport-transfer", barcelona)).toContain("El Prat");
  });

  it("formats prices per language, and marks free services complimentary", () => {
    const spaLondon = london.services.find((s) => s.id === "spa-treatment")!;
    const spaBarcelona = barcelona.services.find((s) => s.id === "spa-treatment")!;
    expect(servicePrice(STRINGS.en, spaLondon)).toBe("from €95");
    expect(servicePrice(STRINGS.en, spaBarcelona)).toBe("from €85");
    expect(servicePrice(STRINGS.de, spaLondon)).toBe("ab €95");
    const restaurant = london.services.find((s) => s.id === "restaurant-reservation")!;
    expect(servicePrice(STRINGS.en, restaurant)).toBe("Complimentary");
  });

  it("translates booked service labels but leaves place names alone", () => {
    const service = {
      booking_type: "hotel_service",
      item_id: "spa-treatment",
      item_name: "Spa treatment",
    };
    expect(bookedItemLabel(STRINGS.es, service)).toBe("Tratamiento de spa");
    const place = { booking_type: "place", item_id: "abc", item_name: "Hjem" };
    expect(bookedItemLabel(STRINGS.es, place)).toBe("Hjem");
    expect(bookedItemLabel(STRINGS.es, { ...service, item_id: "unknown-id" })).toBe(
      "Spa treatment",
    );
  });

  it("isServiceId guards unknown ids", () => {
    expect(isServiceId("late-checkout")).toBe(true);
    expect(isServiceId("nope")).toBe(false);
  });
});

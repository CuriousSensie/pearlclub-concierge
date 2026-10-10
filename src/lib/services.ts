import { SERVICE_IDS, type ServiceId } from "./domain";
import type { Hotel, HotelService } from "./hotels";
import { en, fill, type Strings } from "./i18n";

export const isServiceId = (id: string): id is ServiceId =>
  (SERVICE_IDS as readonly string[]).includes(id);

/** The English service name stored on bookings and used in the model's context. */
export const canonicalServiceName = (id: ServiceId): string => en.services[id].name;

export const serviceName = (s: Strings, id: ServiceId): string => s.services[id].name;

export const serviceDescription = (s: Strings, id: ServiceId, hotel: Hotel): string =>
  fill(s.services[id].description, { airport: hotel.airport });

export const servicePrice = (s: Strings, service: HotelService): string =>
  service.priceFromEur == null
    ? s.complimentary
    : fill(s.priceFrom, { price: `€${service.priceFromEur}` });

/** The label to show for a booked item in the guest's language (services are translated; places are not). */
export function bookedItemLabel(
  s: Strings,
  item: { booking_type: string; item_id: string; item_name: string },
): string {
  return item.booking_type === "hotel_service" && isServiceId(item.item_id)
    ? serviceName(s, item.item_id)
    : item.item_name;
}

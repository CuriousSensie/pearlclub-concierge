import { Chat } from "@/components/Chat";
import { getHotel } from "@/lib/hotels";

export default async function Page({ searchParams }: PageProps<"/">) {
  const { hotel } = await searchParams;
  const hotelId = getHotel(Array.isArray(hotel) ? hotel[0] : hotel).id;
  return <Chat hotelId={hotelId} />;
}

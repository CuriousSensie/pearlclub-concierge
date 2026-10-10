"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/client/api";

/** How many booking requests the guest has made, plus a version that bumps when one is added. */
export function useBookings() {
  const [count, setCount] = useState(0);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    api.bookings
      .list()
      .then((bookings) => setCount(bookings.length))
      .catch((err) => console.error("bookings load failed", err));
  }, []);

  const recordBooked = useCallback(() => {
    setCount((c) => c + 1);
    setVersion((v) => v + 1);
  }, []);

  return { count, version, recordBooked };
}

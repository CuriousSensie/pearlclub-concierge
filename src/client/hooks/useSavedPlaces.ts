"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/client/api";
import { useToast } from "@/components/ui/Toaster";
import type { Strings } from "@/lib/i18n";
import type { Place } from "@/lib/types";

/** The guest's saved places with optimistic toggling and toast feedback. */
export function useSavedPlaces(s: Strings) {
  const toast = useToast();
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    api.saves
      .list()
      .then((places) => setSavedIds(new Set(places.map((p) => p.id))))
      .catch((err) => console.error("saved places load failed", err));
  }, []);

  const toggle = useCallback(
    async (place: Place) => {
      const wasSaved = savedIds.has(place.id);
      const apply = (add: boolean) =>
        setSavedIds((prev) => {
          const next = new Set(prev);
          if (add) next.add(place.id);
          else next.delete(place.id);
          return next;
        });

      apply(!wasSaved); // optimistic
      try {
        if (wasSaved) await api.saves.remove(place.id);
        else await api.saves.add([place.id]);
        toast(wasSaved ? s.toastRemoved : s.toastSaved);
      } catch (err) {
        console.error("toggle save failed", err);
        apply(wasSaved); // roll back
        toast(s.toastError, "error");
      }
    },
    [savedIds, toast, s],
  );

  const saveMany = useCallback(
    async (places: Place[]) => {
      const ids = [...new Set(places.map((p) => p.id))];
      try {
        await api.saves.add(ids);
        setSavedIds((prev) => new Set([...prev, ...ids]));
        toast(s.toastSaved);
      } catch (err) {
        console.error("save all failed", err);
        toast(s.toastError, "error");
      }
    },
    [toast, s],
  );

  return { savedIds, toggle, saveMany };
}

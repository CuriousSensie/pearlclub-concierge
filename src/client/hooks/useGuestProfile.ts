"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/client/api";
import type { ConciergeUIMessage } from "@/client/chatTypes";
import { readLocalProfile, writeLocalProfile } from "@/client/localProfile";
import type { Language, Profile } from "@/lib/types";

/** The newest preferences the assistant saved during this conversation, if any. */
function learnedPreferences(messages: ConciergeUIMessage[]): Profile | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    for (let j = messages[i].parts.length - 1; j >= 0; j--) {
      const part = messages[i].parts[j];
      if (part.type === "tool-save_preferences" && part.state === "output-available") {
        return part.output.profile;
      }
    }
  }
  return null;
}

/**
 * The guest's preferences. They show instantly from this browser, are reconciled with the server
 * copy, and preferences learned in chat are mirrored locally.
 */
export function useGuestProfile(
  messages: ConciergeUIMessage[],
  onServerLanguage: (lang: Language) => void,
) {
  const [profile, setProfileState] = useState<Profile | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Local storage is read after mount to avoid a hydration mismatch.
    const local = readLocalProfile();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProfileState(local);
    setHydrated(true);

    api.profile
      .get()
      .then((server) => {
        if (server) {
          setProfileState(server);
          writeLocalProfile(server);
          onServerLanguage(server.language);
        } else if (local) {
          // The server copy is missing (new database or cleared); restore it from this browser.
          const { travel_style, budget, interests, dietary, language } = local;
          return api.profile.update({ travel_style, budget, interests, dietary, language });
        }
      })
      .catch((err) => console.error("profile sync failed", err));
  }, [onServerLanguage]);

  const setProfile = useCallback((next: Profile) => {
    setProfileState(next);
    writeLocalProfile(next);
  }, []);

  const learned = learnedPreferences(messages);
  const learnedKey = learned?.updated_at ?? null;
  useEffect(() => {
    if (learned) writeLocalProfile(learned);
    // Keyed on the profile version so each saved preference is written once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [learnedKey]);

  return { profile: learned ?? profile, hydrated, setProfile };
}

import type { Profile } from "@/lib/types";

const KEY = "pc_profile";

/** Guest preferences cached in this browser so they show instantly and survive server hiccups. */
export function readLocalProfile(): Profile | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Profile) : null;
  } catch (err) {
    console.warn("could not read saved preferences", err);
    return null;
  }
}

export function writeLocalProfile(profile: Profile): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(profile));
  } catch (err) {
    console.warn("could not save preferences locally", err);
  }
}

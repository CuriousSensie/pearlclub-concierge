import "server-only";
import { isLanguage } from "@/lib/i18n";
import type { Profile } from "@/types";
import { getSupabase } from "./client";
import type { Database } from "./database.types";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

const rowToProfile = (row: ProfileRow): Profile => ({
  session_id: row.session_id,
  name: row.name,
  language: isLanguage(row.language) ? row.language : "en",
  travel_style: row.travel_style,
  budget: row.budget,
  interests: row.interests ?? [],
  dietary: row.dietary ?? [],
  home_city: row.home_city,
  updated_at: row.updated_at ?? undefined,
});

export type ProfilePatch = Partial<
  Pick<
    Profile,
    "name" | "language" | "travel_style" | "budget" | "home_city" | "interests" | "dietary"
  >
>;

const union = (a: string[], b: string[] | undefined): string[] => [
  ...new Set([...a, ...(b ?? [])].map((s) => s.trim().toLowerCase()).filter(Boolean)),
];

export async function getProfile(sessionId: string): Promise<Profile | null> {
  const { data, error } = await getSupabase()
    .from("profiles")
    .select("*")
    .eq("session_id", sessionId)
    .maybeSingle();
  if (error) throw new Error(`profile lookup failed: ${error.message}`);
  return data ? rowToProfile(data) : null;
}

/**
 * Saves a partial profile. `merge` unions the list fields with what is stored (preferences the
 * assistant learns over time); `replace` overwrites them (the onboarding chips, where guests can deselect).
 */
async function saveProfile(
  sessionId: string,
  patch: ProfilePatch,
  mode: "merge" | "replace",
): Promise<Profile> {
  const existing = await getProfile(sessionId);
  const defined = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
  const lists =
    mode === "merge"
      ? {
          interests: union(existing?.interests ?? [], patch.interests),
          dietary: union(existing?.dietary ?? [], patch.dietary),
        }
      : {};
  const { data, error } = await getSupabase()
    .from("profiles")
    .upsert({
      ...(existing ? { ...existing, updated_at: undefined } : {}),
      ...defined,
      ...lists,
      session_id: sessionId,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw new Error(`profile upsert failed: ${error.message}`);
  return rowToProfile(data);
}

export const upsertProfile = (sessionId: string, patch: ProfilePatch) =>
  saveProfile(sessionId, patch, "merge");

export const replaceProfile = (sessionId: string, patch: ProfilePatch) =>
  saveProfile(sessionId, patch, "replace");

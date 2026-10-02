import "server-only";
import { getSupabase } from "./supabase";
import type { Profile } from "@/types";

const union = (a: string[] | null | undefined, b: string[] | undefined): string[] => [
  ...new Set([...(a ?? []), ...(b ?? [])].map((s) => s.trim().toLowerCase()).filter(Boolean)),
];

export async function getProfile(sessionId: string): Promise<Profile | null> {
  const { data, error } = await getSupabase()
    .from("profiles")
    .select("*")
    .eq("session_id", sessionId)
    .maybeSingle();
  if (error) throw new Error(`profile lookup failed: ${error.message}`);
  return data as Profile | null;
}

export type ProfilePatch = Partial<
  Pick<
    Profile,
    "name" | "language" | "travel_style" | "budget" | "home_city" | "interests" | "dietary"
  >
>;

/** Upserts a partial profile; list fields are merged with what's already stored. */
export async function upsertProfile(sessionId: string, patch: ProfilePatch): Promise<Profile> {
  const existing = await getProfile(sessionId);
  const row = {
    session_id: sessionId,
    ...(existing ?? {}),
    ...Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)),
    interests: union(existing?.interests, patch.interests),
    dietary: union(existing?.dietary, patch.dietary),
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await getSupabase().from("profiles").upsert(row).select().single();
  if (error) throw new Error(`profile upsert failed: ${error.message}`);
  return data as Profile;
}

/** Replaces list fields instead of merging (used by the onboarding chips, where users can deselect). */
export async function replaceProfile(sessionId: string, patch: ProfilePatch): Promise<Profile> {
  const existing = await getProfile(sessionId);
  const row = {
    session_id: sessionId,
    ...(existing ?? {}),
    ...Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)),
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await getSupabase().from("profiles").upsert(row).select().single();
  if (error) throw new Error(`profile upsert failed: ${error.message}`);
  return data as Profile;
}

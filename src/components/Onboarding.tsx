"use client";

import { useState } from "react";
import clsx from "clsx";
import { useApp } from "./AppContext";
import { useToast } from "./Toaster";
import { sessionHeaders } from "@/lib/session";
import type { Profile } from "@/types";

type Draft = { travel_style: string | null; budget: string | null; interests: string[] };

function ChipRow<T extends string>({
  label,
  options,
  labels,
  selected,
  onToggle,
}: {
  label: string;
  options: T[];
  labels: Record<string, string>;
  selected: (v: T) => boolean;
  onToggle: (v: T) => void;
}) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            aria-pressed={selected(o)}
            onClick={() => onToggle(o)}
            className={clsx(
              "rounded-full border px-3 py-1.5 text-sm transition-colors",
              selected(o)
                ? "border-accent bg-accent text-accent-ink"
                : "border-line bg-card text-ink",
            )}
          >
            {labels[o] ?? o}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Onboarding({
  profile,
  onSaved,
}: {
  profile: Profile | null;
  onSaved: (profile: Profile) => void;
}) {
  const { s, lang } = useApp();
  const toast = useToast();
  const hasPrefs = Boolean(
    profile && (profile.travel_style || profile.budget || profile.interests?.length),
  );
  const [editing, setEditing] = useState(!hasPrefs);
  const [skipped, setSkipped] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<Draft>({
    travel_style: profile?.travel_style ?? null,
    budget: profile?.budget ?? null,
    interests: profile?.interests ?? [],
  });

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "content-type": "application/json", ...sessionHeaders() },
        body: JSON.stringify({ ...draft, language: lang }),
      });
      const data = (await res.json()) as { profile?: Profile; error?: string };
      if (!res.ok || !data.profile) throw new Error(data.error ?? "Request failed");
      onSaved(data.profile);
      setEditing(false);
      toast(s.toastPrefs);
    } catch (err) {
      console.error("save preferences failed", err);
      toast(s.toastError, "error");
    } finally {
      setSaving(false);
    }
  }

  if (skipped && !hasPrefs) return null;

  if (!editing) {
    return (
      <p className="text-sm text-muted">
        {s.onbDone}{" "}
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="font-medium text-accent underline"
        >
          {s.onbEdit}
        </button>
      </p>
    );
  }

  const canSave = Boolean(draft.travel_style || draft.budget || draft.interests.length);

  return (
    <section
      aria-label={s.onbTitle}
      className="rise space-y-4 rounded-2xl border border-line bg-card p-4 shadow-[var(--shadow)]"
    >
      <h2 className="font-display text-lg">{s.onbTitle}</h2>
      <ChipRow
        label={s.onbStyle}
        options={Object.keys(s.styles)}
        labels={s.styles}
        selected={(v) => draft.travel_style === v}
        onToggle={(v) => setDraft((d) => ({ ...d, travel_style: d.travel_style === v ? null : v }))}
      />
      <ChipRow
        label={s.onbBudget}
        options={Object.keys(s.budgets)}
        labels={s.budgets}
        selected={(v) => draft.budget === v}
        onToggle={(v) => setDraft((d) => ({ ...d, budget: d.budget === v ? null : v }))}
      />
      <ChipRow
        label={s.onbInterests}
        options={Object.keys(s.interests)}
        labels={s.interests}
        selected={(v) => draft.interests.includes(v)}
        onToggle={(v) =>
          setDraft((d) => ({
            ...d,
            interests: d.interests.includes(v)
              ? d.interests.filter((i) => i !== v)
              : [...d.interests, v],
          }))
        }
      />
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={!canSave || saving}
          onClick={save}
          className="h-10 rounded-full bg-accent px-5 text-sm font-medium text-accent-ink disabled:opacity-40"
        >
          {s.save}
        </button>
        <button
          type="button"
          onClick={() => (hasPrefs ? setEditing(false) : setSkipped(true))}
          className="text-sm text-muted underline"
        >
          {s.onbSkip}
        </button>
      </div>
    </section>
  );
}

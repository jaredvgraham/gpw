export const AD_SOURCES = ["google", "meta"] as const;

export type AdSource = (typeof AD_SOURCES)[number];

export const AD_SOURCE_LABELS: Record<AdSource, string> = {
  google: "Google Ads",
  meta: "Meta Ads",
};

export function isAdSource(value: unknown): value is AdSource {
  return value === "google" || value === "meta";
}

/** Job mark wins. Meta ad landing quotes (`source: meta_ad`) count as Meta. “Found us on Google” does not count as paid. */
export function jobPaidAdSource(
  job: { adSource?: AdSource },
  lead?: { source?: string; howYouFoundUs?: string } | null
): AdSource | null {
  if (job.adSource) return job.adSource;
  if (!lead) return null;
  if (lead.source === "meta_ad") return "meta";
  const text = (lead.howYouFoundUs ?? "").toLowerCase();
  if (text.includes("instagram") || text.includes("facebook") || text.includes("meta")) {
    return "meta";
  }
  return null;
}

export function isPaintAdNote(note?: string): boolean {
  const text = (note ?? "").toLowerCase();
  return text.includes("paint") || text.includes("cabinet");
}

export function isPaintAdExpense(expense: { type: string; note?: string }): boolean {
  return expense.type === "Ads" && isPaintAdNote(expense.note);
}

function platformFromNote(note?: string): AdSource | null {
  const text = (note ?? "").toLowerCase();
  if (text.includes("google")) return "google";
  if (
    text.includes("meta") ||
    text.includes("facebook") ||
    text.includes("instagram") ||
    /\bfb\b/.test(text) ||
    /\big\b/.test(text)
  ) {
    return "meta";
  }
  return null;
}

/** Power-washing ad platform. Paint ads are not Meta/Google for ROAS. */
export function adSpendPlatform(note?: string): AdSource | null {
  if (isPaintAdNote(note)) return null;
  return platformFromNote(note);
}

export function adsNoteKind(note?: string): "paint" | AdSource | null {
  if (isPaintAdNote(note)) return "paint";
  return platformFromNote(note);
}

export type AdsNoteKind = NonNullable<ReturnType<typeof adsNoteKind>>;

export const ADS_NOTE_OPTIONS: { value: AdsNoteKind; label: string }[] = [
  { value: "meta", label: "Meta" },
  { value: "google", label: "Google" },
  { value: "paint", label: "Paint" },
];

const ADS_NOTE_WORDS: Record<AdsNoteKind, string> = {
  meta: "Meta",
  google: "Google",
  paint: "Paint",
};

export function adsExpenseNote(kind: AdsNoteKind, extra?: string) {
  const word = ADS_NOTE_WORDS[kind];
  const text = (extra ?? "").trim();
  if (!text) return word;
  if (adsNoteKind(text) === kind) return text;
  return `${word} ${text}`;
}

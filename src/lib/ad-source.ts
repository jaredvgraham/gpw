export const AD_SOURCES = ["google", "meta"] as const;

export type AdSource = (typeof AD_SOURCES)[number];

export const AD_SOURCE_LABELS: Record<AdSource, string> = {
  google: "Google Ads",
  meta: "Meta Ads",
};

export function isAdSource(value: unknown): value is AdSource {
  return value === "google" || value === "meta";
}

/** Job mark wins. Instant Form counts as Meta. “Found us on Google” does not count as paid. */
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

export function adSpendPlatform(note?: string): AdSource | null {
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

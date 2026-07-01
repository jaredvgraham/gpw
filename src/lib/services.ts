import { DEFAULT_SERVICES } from "@/lib/constants";
import type { Service } from "@/types";

const SERVICE_RANK = new Map(
  DEFAULT_SERVICES.map((service, index) => [service.name.toLowerCase(), index])
);

/** Display services in the standard GPW order (house → roof → decks → … → Other). */
export function sortServicesForDisplay<T extends Pick<Service, "name">>(services: T[]): T[] {
  return [...services].sort((a, b) => {
    const aKey = a.name.toLowerCase();
    const bKey = b.name.toLowerCase();
    const aRank = SERVICE_RANK.get(aKey) ?? (aKey === "other" ? Number.MAX_SAFE_INTEGER : 500);
    const bRank = SERVICE_RANK.get(bKey) ?? (bKey === "other" ? Number.MAX_SAFE_INTEGER : 500);
    if (aRank !== bRank) return aRank - bRank;
    return a.name.localeCompare(b.name);
  });
}

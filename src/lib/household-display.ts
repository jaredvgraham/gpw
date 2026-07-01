import type { Customer, Job } from "@/types";
import { getCustomerAddress, getCustomerName } from "@/lib/utils";

export interface HouseholdGroup {
  key: string;
  householdId?: string;
  address: string;
  members: Customer[];
  displayName: string;
  shortLabel: string;
}

export interface CustomerInsight {
  key: string;
  name: string;
  memberNames: string[];
  count: number;
  revenue: number;
  address?: string;
  isHousehold: boolean;
}

export interface JobHouseholdDisplay {
  primaryName: string;
  householdLabel?: string;
  otherMemberNames: string[];
  memberNames: string[];
  memberCount: number;
  address?: string;
}

function getJobCustomer(job: Job): Customer | null {
  return typeof job.customer === "object" && job.customer !== null ? job.customer : null;
}

function formatMemberList(names: string[]): string {
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} & ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} & ${names[names.length - 1]}`;
}

function getHouseholdId(customer: Customer): string | undefined {
  if (!customer.household) return undefined;
  return typeof customer.household === "object" ? customer.household._id : customer.household;
}

function householdAddressLabel(members: Customer[]): string {
  const household = members[0]?.household;
  if (household && typeof household === "object") {
    return [household.streetAddress, household.city].filter(Boolean).join(", ");
  }
  const withAddress = members.find((member) => member.streetAddress);
  if (withAddress) {
    return [withAddress.streetAddress, withAddress.city].filter(Boolean).join(", ");
  }
  return "";
}

export function buildHouseholdIndex(jobs: Job[]): Map<string, HouseholdGroup> {
  const customersById = new Map<string, Customer>();

  for (const job of jobs) {
    const customer = getJobCustomer(job);
    if (customer) {
      customersById.set(customer._id, customer);
    }
  }

  const groupsByKey = new Map<string, Customer[]>();

  for (const customer of customersById.values()) {
    const householdId = getHouseholdId(customer);
    const key = householdId ? `household:${householdId}` : `solo:${customer._id}`;
    const members = groupsByKey.get(key) ?? [];
    members.push(customer);
    groupsByKey.set(key, members);
  }

  const customerToGroup = new Map<string, HouseholdGroup>();

  for (const [key, members] of groupsByKey) {
    const sorted = [...members].sort((a, b) => a.name.localeCompare(b.name));
    const names = sorted.map((member) => member.name);
    const address = householdAddressLabel(sorted);
    const displayName =
      sorted.length > 1
        ? address || formatMemberList(names)
        : sorted[0]?.name ?? "Customer";
    const shortLabel =
      sorted.length > 1 ? `${sorted.length} at ${address || "same address"}` : names[0] ?? "";

    const group: HouseholdGroup = {
      key,
      householdId: key.startsWith("household:") ? key.replace("household:", "") : undefined,
      address,
      members: sorted,
      displayName,
      shortLabel,
    };

    for (const member of sorted) {
      customerToGroup.set(member._id, group);
    }
  }

  return customerToGroup;
}

export function getJobHouseholdDisplay(job: Job, jobs: Job[]): JobHouseholdDisplay {
  const customer = getJobCustomer(job);
  const primaryName = customer?.name ?? getCustomerName(job);

  if (!customer) {
    return { primaryName, otherMemberNames: [], memberNames: [primaryName], memberCount: 1 };
  }

  const index = buildHouseholdIndex(jobs);
  const group = index.get(customer._id);

  if (!group || group.members.length <= 1) {
    return {
      primaryName,
      otherMemberNames: [],
      memberNames: [primaryName],
      memberCount: 1,
      address: getCustomerAddress(customer),
    };
  }

  const otherMemberNames = group.members
    .filter((member) => member._id !== customer._id)
    .map((member) => member.name);

  return {
    primaryName,
    householdLabel: group.displayName,
    otherMemberNames,
    memberNames: group.members.map((member) => member.name),
    memberCount: group.members.length,
    address: group.address || getCustomerAddress(customer),
  };
}

export function getJobHouseholdTitle(job: Job, jobs: Job[]): string {
  const display = getJobHouseholdDisplay(job, jobs);
  if (display.memberCount > 1) {
    return `${display.primaryName} · ${display.memberCount} people`;
  }
  return display.primaryName;
}

export function getJobHouseholdEventTitle(
  job: Job,
  jobs: Job[],
  extra: string[] = []
): string {
  const display = getJobHouseholdDisplay(job, jobs);
  const namePart =
    display.memberCount > 1
      ? `${display.primaryName} (${display.memberNames.join(", ")})`
      : display.primaryName;
  return [namePart, ...extra].filter(Boolean).join(" · ");
}

export function buildTopCustomersByHousehold(jobs: Job[], limit = 8): CustomerInsight[] {
  const index = buildHouseholdIndex(jobs);
  const grouped = new Map<string, CustomerInsight>();

  for (const job of jobs) {
    const customer = getJobCustomer(job);
    if (!customer) continue;

    const group = index.get(customer._id);
    const groupKey = group?.key ?? `solo:${customer._id}`;
    const revenue = job.finalPrice ?? 0;

    const existing = grouped.get(groupKey) ?? {
      key: groupKey,
      name: group?.displayName ?? customer.name,
      memberNames: group?.members.map((member) => member.name) ?? [customer.name],
      count: 0,
      revenue: 0,
      address: group?.address,
      isHousehold: (group?.members.length ?? 1) > 1,
    };

    existing.count += 1;
    existing.revenue += revenue;
    grouped.set(groupKey, existing);
  }

  return [...grouped.values()]
    .sort((a, b) => b.revenue - a.revenue || b.count - a.count)
    .slice(0, limit);
}

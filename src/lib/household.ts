import type { Types } from "mongoose";
import Customer from "@/models/Customer";
import Household from "@/models/Household";

type CustomerDoc = {
  _id: Types.ObjectId;
  name: string;
  phone: string;
  email?: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  household?: Types.ObjectId;
};

function cleanPart(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[.,#]/g, "")
    .replace(/\s+/g, " ");
}

export function normalizeAddressKey(street?: string, city?: string): string | null {
  if (!street?.trim() || !city?.trim()) return null;
  return `${cleanPart(street)}|${cleanPart(city)}`;
}

function householdFields(customer: CustomerDoc) {
  return {
    streetAddress: customer.streetAddress?.trim() ?? "",
    city: customer.city?.trim() ?? "",
    state: customer.state?.trim(),
    zipCode: customer.zipCode?.trim(),
    addressKey: normalizeAddressKey(customer.streetAddress, customer.city) ?? "",
  };
}

export async function findCustomersAtAddress(
  addressKey: string,
  excludeId?: string
): Promise<CustomerDoc[]> {
  const customers = await Customer.find({
    streetAddress: { $exists: true, $ne: "" },
    city: { $exists: true, $ne: "" },
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
  }).lean();

  return customers.filter(
    (customer) =>
      normalizeAddressKey(customer.streetAddress, customer.city) === addressKey
  ) as CustomerDoc[];
}

async function createHouseholdForCustomers(customers: CustomerDoc[]) {
  const primary = customers[0];
  const fields = householdFields(primary);
  const household = await Household.create(fields);

  await Customer.updateMany(
    { _id: { $in: customers.map((customer) => customer._id) } },
    { household: household._id }
  );

  return household;
}

async function assignCustomersToHousehold(
  customerIds: Types.ObjectId[],
  householdId: Types.ObjectId
) {
  await Customer.updateMany({ _id: { $in: customerIds } }, { household: householdId });
}

async function mergeHouseholds(targetId: Types.ObjectId, sourceId: Types.ObjectId) {
  await Customer.updateMany({ household: sourceId }, { household: targetId });
  await Household.findByIdAndDelete(sourceId);
}

export async function ensureHouseholdForCustomer(customerId: string) {
  const customer = await Customer.findById(customerId);
  if (!customer) return null;

  const addressKey = normalizeAddressKey(customer.streetAddress, customer.city);
  if (!addressKey) return customer.household ?? null;

  const others = await findCustomersAtAddress(addressKey, customerId);

  if (customer.household) {
    if (others.length === 0) return customer.household;
    const unlinked = others.filter((other) => !other.household);
    if (unlinked.length > 0) {
      await assignCustomersToHousehold(
        unlinked.map((other) => other._id),
        customer.household
      );
    }
    for (const other of others) {
      if (other.household && String(other.household) !== String(customer.household)) {
        await mergeHouseholds(customer.household, other.household);
      }
    }
    return customer.household;
  }

  const householdIds = [
    ...new Set(
      others.filter((other) => other.household).map((other) => String(other.household))
    ),
  ];

  if (householdIds.length === 1) {
    const householdId = others.find((other) => other.household)!.household!;
    customer.household = householdId;
    await customer.save();
    return householdId;
  }

  if (householdIds.length > 1) {
    const primaryHousehold = others.find((other) => other.household)!.household!;
    for (const other of others) {
      if (other.household && String(other.household) !== String(primaryHousehold)) {
        await mergeHouseholds(primaryHousehold, other.household);
      }
    }
    await assignCustomersToHousehold([customer._id], primaryHousehold);
    return primaryHousehold;
  }

  if (others.length === 0) {
    return null;
  }

  const household = await createHouseholdForCustomers([customer, ...others]);
  return household._id;
}

export async function linkCustomers(customerId: string, targetCustomerId: string) {
  if (customerId === targetCustomerId) {
    throw new Error("Cannot link a customer to themselves");
  }

  const [customer, target] = await Promise.all([
    Customer.findById(customerId),
    Customer.findById(targetCustomerId),
  ]);

  if (!customer || !target) {
    throw new Error("Customer not found");
  }

  const customerKey = normalizeAddressKey(customer.streetAddress, customer.city);
  const targetKey = normalizeAddressKey(target.streetAddress, target.city);

  if (!customerKey || !targetKey) {
    throw new Error("Both customers need a street address and city to link");
  }

  if (customerKey !== targetKey) {
    throw new Error("Customers must share the same address to link");
  }

  if (customer.household && target.household) {
    if (String(customer.household) === String(target.household)) {
      return customer.household;
    }
    await mergeHouseholds(customer.household, target.household);
    return customer.household;
  }

  if (customer.household) {
    target.household = customer.household;
    await target.save();
    return customer.household;
  }

  if (target.household) {
    customer.household = target.household;
    await customer.save();
    return target.household;
  }

  const household = await createHouseholdForCustomers([customer, target]);
  return household._id;
}

export async function unlinkCustomerFromHousehold(customerId: string) {
  const customer = await Customer.findById(customerId);
  if (!customer?.household) return;

  const householdId = customer.household;
  customer.household = undefined;
  await customer.save();

  const remaining = await Customer.countDocuments({ household: householdId });
  if (remaining <= 1) {
    const lastCustomer = await Customer.findOne({ household: householdId });
    if (lastCustomer) {
      lastCustomer.household = undefined;
      await lastCustomer.save();
    }
    await Household.findByIdAndDelete(householdId);
  }
}

export async function getHouseholdContext(customerId: string) {
  const customer = await Customer.findById(customerId).lean();
  if (!customer) return null;

  await ensureHouseholdForCustomer(customerId);
  const refreshed = await Customer.findById(customerId).lean();
  if (!refreshed) return null;

  const household = refreshed.household
    ? await Household.findById(refreshed.household).lean()
    : null;

  const members = household
    ? await Customer.find({ household: household._id }).sort({ name: 1 }).lean()
    : [refreshed];

  const addressKey = normalizeAddressKey(refreshed.streetAddress, refreshed.city);
  const suggestions =
    addressKey && household
      ? (await findCustomersAtAddress(addressKey, customerId)).filter(
          (other) => !other.household || String(other.household) !== String(household._id)
        )
      : addressKey
        ? await findCustomersAtAddress(addressKey, customerId)
        : [];

  return {
    customer: refreshed,
    household,
    members,
    suggestions,
  };
}

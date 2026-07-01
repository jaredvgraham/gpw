import { connectDB } from "@/lib/mongodb";
import Service from "@/models/Service";
import Job from "@/models/Job";
import { DEFAULT_SERVICES } from "@/lib/constants";

const RETIRED_SERVICE_NAMES = ["Exterior window cleaning"];

export async function seedDefaultServices(): Promise<void> {
  await connectDB();

  for (const name of RETIRED_SERVICE_NAMES) {
    await Service.deleteOne({ name });
  }

  await Job.updateMany(
    { "services.name": "Exterior window cleaning" },
    { $set: { "services.$[service].name": "Window cleaning" } },
    { arrayFilters: [{ "service.name": "Exterior window cleaning" }] }
  );

  for (const service of DEFAULT_SERVICES) {
    await Service.findOneAndUpdate(
      { name: service.name },
      { name: service.name, description: service.description, active: true },
      { upsert: true, new: true }
    );
  }
}

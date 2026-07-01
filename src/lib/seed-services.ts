import { connectDB } from "@/lib/mongodb";
import Service from "@/models/Service";
import { DEFAULT_SERVICES } from "@/lib/constants";

export async function seedDefaultServices(): Promise<void> {
  await connectDB();

  for (const service of DEFAULT_SERVICES) {
    await Service.findOneAndUpdate(
      { name: service.name },
      { name: service.name, description: service.description, active: true },
      { upsert: true, new: true }
    );
  }
}

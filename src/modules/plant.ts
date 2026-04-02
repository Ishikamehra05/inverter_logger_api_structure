// dao/plant.dao.ts
import { db } from "@/data/db_sql";
import { plants } from "@/data/plant_management";
import { eq } from "drizzle-orm";

export type CreatePlantInput = {
  plantname: string;
  installed_date: string;
  capacity: number;
  price: string;
  plant_type: string;
  longitude?: number;
  latitude?: number;
  address?: string;
  picture?: string;
  userId: number;
};

export class PlantDAO {
  static async createPlant(data: CreatePlantInput) {
    const result = await db
      .insert(plants)
      .values({
        plantname: data.plantname,
        installed_date: new Date(data.installed_date),
        capacity: data.capacity,
        price: data.price,
        plant_type: data.plant_type,
        longitude: data.longitude,
        latitude: data.latitude,
        address: data.address,
        picture: data.picture,
        userId: data.userId,
      })
      .$returningId();

    const insertedPlant = await db
      .select()
      .from(plants)
      .where(eq(plants.plantid, result[0].plantid));

    return insertedPlant[0];
  }


  static async getPlantById(id: number) {
    const result = await db
      .select()
      .from(plants)
      .where(eq(plants.plantid, id));

    return result[0]; // single record
  }

  static async deletePlantById(id: number) {
    return await db.delete(plants).where(eq(plants.plantid, id));
  }

  static async updatePlantById(
    id: number,
    data: Partial<typeof plants.$inferInsert>
  ) {
    return await db
      .update(plants)
      .set(data)
      .where(eq(plants.plantid, id));
  }


  static async getPlantByName(plantname: string) {
    const result = await db
      .select()
      .from(plants)
      .where(eq(plants.plantname, plantname));

    return result[0];
  }

  static async getPlantsByAccess(user: any) {
    console.log("USER:", user);

    if (user.role?.isSuperAdmin) {
      console.log("Fetching ALL plants");
      return await db.select().from(plants);
    }

    console.log("Fetching plants for userId:", user.userId);

    const result = await db
      .select()
      .from(plants)
      .where(eq(plants.userId, user.userId));

    console.log("RESULT:", result);

    return result;
  }
}
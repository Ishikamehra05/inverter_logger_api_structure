import { db } from "@/data/db_sql";
import { inverter, plants } from "@/data/plant_management";
import { eq } from "drizzle-orm";

export type CreateInverterInput = {
  macaddress: string;
  plantid: number;
};

export const inverterDao = {

  //  CHECK PLANT EXISTS (FK VALIDATION)
  async plantExists(plantid: number) {
    const result = await db
      .select()
      .from(plants)
      .where(eq(plants.plantid, plantid));

    return result.length > 0;
  },

  //  CREATE
  async create(data: CreateInverterInput) {
    // 🔥 FK VALIDATION
    const plantExists = await this.plantExists(data.plantid);

    if (!plantExists) {
      throw new Error("INVALID_PLANT");
    }

    const result = await db
      .insert(inverter)
      .values(data)
      .$returningId();

    const newData = await db
      .select()
      .from(inverter)
      .where(eq(inverter.id, result[0].id));

    return newData[0];
  },

  // GET BY PLANT (IMPORTANT)
  async getByPlant(plantid: number) {
    return db
      .select()
      .from(inverter)
      .where(eq(inverter.plantid, plantid));
  },

  // GET ALL
  async getAll() {
    return db.select().from(inverter);
  },

  // GET BY ID
  async getById(id: number) {
    const result = await db
      .select()
      .from(inverter)
      .where(eq(inverter.id, id));

    return result[0];
  },

  // UPDATE
  async update(id: number, macaddress: string) {
    await db
      .update(inverter)
      .set({ macaddress })
      .where(eq(inverter.id, id));

    return this.getById(id);
  },

  //  DELETE
  async delete(id: number) {
    await db
      .delete(inverter)
      .where(eq(inverter.id, id));
  },

  //  DUPLICATE CHECK
  async findBySerial(macaddress: string) {
    const result = await db
      .select()
      .from(inverter)
      .where(eq(inverter.macaddress, macaddress));

    return result[0];
  },
};
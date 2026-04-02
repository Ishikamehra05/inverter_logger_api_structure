import { db } from "@/data/db_sql";
import { logger, plants } from "@/data/plant_management";
import { eq } from "drizzle-orm";

export type CreateloggerInput = {
  macaddress: string;
  plantid: number;
};

export const loggerDao = {

  //  CHECK PLANT EXISTS (FK VALIDATION)
  async plantExists(plantid: number) {
    const result = await db
      .select()
      .from(plants)
      .where(eq(plants.plantid, plantid));

    return result.length > 0;
  },

  //  CREATE
  async create(data: CreateloggerInput) {
    // 🔥 FK VALIDATION
    const plantExists = await this.plantExists(data.plantid);

    if (!plantExists) {
      throw new Error("INVALID_PLANT");
    }

    const result = await db
      .insert(logger)
      .values(data)
      .$returningId();

    const newData = await db
      .select()
      .from(logger)
      .where(eq(logger.id, result[0].id));

    return newData[0];
  },

  // GET BY PLANT (IMPORTANT)
  async getByPlant(plantid: number) {
    return db
      .select()
      .from(logger)
      .where(eq(logger.plantid, plantid));
  },

  // GET ALL
  async getAll() {
    return db.select().from(logger);
  },

  // GET BY ID
  async getById(id: number) {
    const result = await db
      .select()
      .from(logger)
      .where(eq(logger.id, id));

    return result[0];
  },

  // UPDATE
  async update(id: number, macaddress: string) {
    await db
      .update(logger)
      .set({ macaddress })
      .where(eq(logger.id, id));

    return this.getById(id);
  },

  //  DELETE
  async delete(id: number) {
    await db
      .delete(logger)
      .where(eq(logger.id, id));
  },

  //  DUPLICATE CHECK
  async findBySerial(macaddress: string) {
    const result = await db
      .select()
      .from(logger)
      .where(eq(logger.macaddress, macaddress));

    return result[0];
  },
};
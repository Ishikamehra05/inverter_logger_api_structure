import { unique } from "drizzle-orm/gel-core";
import { mysqlTable, int, varchar, timestamp, boolean, decimal, date, float } from "drizzle-orm/mysql-core";
import { users } from "./user_management";

export const plants = mysqlTable("plants", {
  plantid: int("plantid").primaryKey().autoincrement(),

  plantname: varchar("plantname", { length: 255 }).notNull().unique(),
  installed_date: date("installed_date").notNull(),

  capacity: float("capacity").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),

  plant_type: varchar("plant_type", { length: 50 }).notNull(),

  longitude: float("longitude"),
  latitude: float("latitude"),

  address: varchar("address", { length: 500 }),

  picture: varchar("picture", { length: 500 }),

  userId: int("userId")
    .notNull()
    .references(() => users.userId),
  updatedAt: timestamp("updatedAt"),
});


export const inverter = mysqlTable("inverter", {
  id: int("id").primaryKey().autoincrement(),
  macaddress: varchar("macaddress", { length: 255 }).notNull().unique(),
  plantid: int("plantid")
    .notNull()
    .references(() => plants.plantid),
  createdat: timestamp("createdat")
    .defaultNow()
    .notNull(),
});
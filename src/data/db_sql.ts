import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2";

const poolConnection = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "Hbeonlabs@123",
  database: "polycab_solar",
});

export const db = drizzle({ client: poolConnection });

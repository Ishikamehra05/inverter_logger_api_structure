import { mysqlTable, int, varchar, timestamp, boolean, serial } from "drizzle-orm/mysql-core";

// ROLES TABLE
export const roles = mysqlTable("roles", {
  roleId: int("roleId").primaryKey(),
  roleName: varchar("roleName", { length: 50 }).notNull(),
  isSuperadmin: boolean("is_superadmin").default(false),
});

// USERS TABLE
export const users = mysqlTable("users", {
  userId: int("userId").primaryKey().autoincrement(),
  accountName: varchar("accountName", { length: 100 }).notNull().unique(),
  email: varchar("email", { length: 255 }).unique(),
  password: varchar("password", { length: 255 }).notNull(),
  phoneNumber: varchar("phoneNumber", { length: 20 }),

  roleId: int("roleId")
    .notNull()
    .references(() => roles.roleId),

  loginType: varchar("loginType", { length: 50 }),
  registerType: varchar("registerType", { length: 50 }),

  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
  deletedAt: timestamp("deletedAt"),
});

// PERMISSIONS TABLE
export const permissions = mysqlTable("permissions", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
});

// Role permissions table
export const rolePermissions = mysqlTable("role_permissions", {
  id: serial("id").primaryKey(),
  roleId: int("roleId").notNull().references(() => roles.roleId, { onDelete: "cascade" }),
  permission_id: int("permission_id").notNull().references(() => permissions.id, { onDelete: "cascade" }),
});
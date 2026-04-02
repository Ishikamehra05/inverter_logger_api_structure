import { users } from "@/data/user_management";
import { db } from "@/data/db_sql";
import { eq } from "drizzle-orm";

export class AuthDAO {
    async createUser(data: {
        accountName: string;
        email: string;
        password: string;
        phoneNumber?: string;
        roleId: number;
        loginType?: string;
        registerType?: string;
    }) {
        const result = await db.insert(users).values(data);
        const insertedUser = result[0].insertId;
        console.log("Inserted user ID:", insertedUser);
        const newUser = await db
            .select()
            .from(users)
            .where(eq(users.userId, insertedUser));

        return newUser[0];
    }

    async getUserByEmail(email: string) {
        const result = await db
            .select()
            .from(users)
            .where(eq(users.email, email));

        return result[0];
    }

    async getUserByPhone(phoneNumber: string) {
        return await db
            .select()
            .from(users)
            .where(eq(users.phoneNumber, phoneNumber));
    }

    async getAllUsers() {
        return await db.select().from(users);
    }

    async getUserByAccountName(accountName: string) {
        const result = await db
            .select()
            .from(users)
            .where(eq(users.accountName, accountName));

        return result[0];
    }

    async deleteUserById(userId: number) {
        // First check if user exists 
        const existingUser = await db
            .select()
            .from(users)
            .where(eq(users.userId, userId));

        if (!existingUser.length) {
            return null;
        }

        // Perform delete
        await db.delete(users).where(eq(users.userId, userId));

        // Return deleted user
        return existingUser[0];
    }
}

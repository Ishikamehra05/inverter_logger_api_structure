import { users } from "@/data/user_management";
import { db } from "@/data/db_sql";
import { eq } from "drizzle-orm";
import { dateUtils } from '@/data/dateHelpers';

const current_date = new Date(dateUtils.formatDate());

export class forgetPasswordDAO {
  async getUserByAccountName(accountName: string) {
    return await db
      .select()
      .from(users)
      .where(eq(users.accountName, accountName));
  }

  async updatePassword(userId: number, password: string) {
    return await db
      .update(users)
      .set({ password,
        updatedAt: current_date
       })
      .where(eq(users.userId, userId));
  }
}

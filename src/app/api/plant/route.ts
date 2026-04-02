import { NextRequest, NextResponse } from "next/server";
import { PlantDAO } from "@/modules/plant";
import { hasPermission } from "@/lib/jwt";
import { getAuthenticatedUser } from "@/lib/user_auth";

export async function GET(req: NextRequest) {
  try {
    const { success, user, response } = await getAuthenticatedUser(req);

    if (!success || !user) {
      return response;
    }

    const canViewPlants =
      user.role?.isSuperAdmin ||
      await hasPermission(user.userId, "view_plants");

    if (!canViewPlants) {
      return NextResponse.json(
        {
          error: "Forbidden",
          message: "You don't have permission to view plants",
        },
        { status: 403 }
      );
    }

    // ✅ single line instead of if/else
    const plants = await PlantDAO.getPlantsByAccess(user);

    return NextResponse.json({
      success: true,
      data: plants,
    });

  } catch (error) {
    return NextResponse.json(
      { message: "Failed to fetch plants" },
      { status: 500 }
    );
  }
}
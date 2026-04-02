// app/api/plant/create/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PlantDAO } from "@/modules/plant";
import { getAuthenticatedUser } from "@/lib/user_auth";
import { hasPermission } from "@/lib/jwt";
import { dateUtils } from '@/data/dateHelpers';

const current_date = dateUtils.formatDate();


export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      plantname,
      installed_date,
      capacity,
      price,
      plant_type,
      longitude,
      latitude,
      address,
      picture,

    } = body;


    const { success, user, response } = await getAuthenticatedUser(req);

    if (!success || !user) {
      return response;
    }

    const userId = user.userId;

    // permission check
    const canCreate = user.role?.isSuperAdmin || await hasPermission(userId, "create_plants");

    if (!canCreate) {
      return NextResponse.json(
        { error: "Forbidden", message: "No permission to create plant" },
        { status: 403 }
      );
    }


    //  Basic Validation
    if (!plantname  || !capacity || !price || !plant_type) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    const existingPlant = await PlantDAO.getPlantByName(plantname);

    if (existingPlant) {
      return NextResponse.json(
        { message: "Plant name already exists" },
        { status: 400 }
      );
    }

    const plant = await PlantDAO.createPlant({
      plantname,
      installed_date,
      capacity: Number(capacity),
      price,
      plant_type,
      longitude: longitude ? Number(longitude) : undefined,
      latitude: latitude ? Number(latitude) : undefined,
      address,
      picture,
      userId,
    });

     const newData = {
      ...plant,
      installed_date: current_date,
      updatedAt: current_date
    }

    return NextResponse.json({
      success: true,
      data: newData,
      userId: userId,
    });
  } catch (error) {
    console.error("Create Plant Error:", error);

    return NextResponse.json(
      { message: "Failed to create plant" },
      { status: 500 }
    );
  }
}
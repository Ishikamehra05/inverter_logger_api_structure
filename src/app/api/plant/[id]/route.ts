// app/api/plant/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PlantDAO } from "@/modules/plant";
import { hasPermission } from "@/lib/jwt";
import { getAuthenticatedUser } from "@/lib/user_auth";
import { dateUtils } from '@/data/dateHelpers';

const current_date = new Date(dateUtils.formatDate());

// export async function GET(
//   req: NextRequest,
//   { params }: { params: Promise<{ id: string }> }
// ) {
//   try {
//     const { id } = await params;

//     const plantId = Number(id);


//     if (!plantId) {
//       return NextResponse.json(
//         { error: "Invalid plant ID" },
//         { status: 400 }
//       );
//     }

//     const { success, user, response } = await getAuthenticatedUser(req);

//     if (!success || !user) {
//       return response;
//     }

//     const userId = user.userId;

//     // permission check
//     const canViewPlants = user.role?.isSuperAdmin ||
//       await hasPermission(user.userId, "view_plants");

//     if (!canViewPlants) {
//       return NextResponse.json(
//         {
//           error: "Forbidden",
//           message: "You don't have permission to view plants",
//         },
//         { status: 403 }
//       );
//     }


//     const plant = await PlantDAO.getPlantById(plantId);

//     if (!plant) {
//       return NextResponse.json(
//         { error: "Plant not found" },
//         { status: 404 }
//       );
//     }

//     return NextResponse.json({
//       success: true,
//       data: plant,
//     });
//   } catch (error) {
//     console.error("Get Plant Error:", error);

//     return NextResponse.json(
//       { error: "Failed to fetch plant" },
//       { status: 500 }
//     );
//   }
// }

// DELETE API
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const plantId = Number(id);

    if (isNaN(plantId)) {
      return NextResponse.json(
        { message: "Invalid plant ID" },
        { status: 400 }
      );
    }

    const { success, user, response } = await getAuthenticatedUser(req);

    if (!success || !user) {
      return response;
    }

    // const userId = user.userId;

    const canDeletePlants = user.role?.isSuperAdmin ||
      await hasPermission(user.userId, "delete_plants");

    if (!canDeletePlants) {
      return NextResponse.json(
        {
          error: "Forbidden",
          message: "You don't have permission to delete plants",
        },
        { status: 403 }
      );
    }
    await PlantDAO.deletePlantById(plantId);

    return NextResponse.json({
      success: true,
      message: "Plant deleted successfully",
    });
  } catch (error) {
    console.error("Delete Plant Error:", error);

    return NextResponse.json(
      { message: "Failed to delete plant" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const plantId = Number(id);

    if (isNaN(plantId)) {
      return NextResponse.json(
        { error: "Invalid plant ID" },
        { status: 400 }
      );
    }


    const body = await req.json();

    const { success, user, response } = await getAuthenticatedUser(req);

    if (!success || !user) {
      return response;
    }

    const canEditPlants = user.role?.isSuperAdmin ||
      await hasPermission(user.userId, "edit_plants");

    if (!canEditPlants) {
      return NextResponse.json(
        {
          error: "Forbidden",
          message: "You don't have permission to edit plants",
        },
        { status: 403 }
      );
    }

    //  check if plant exists
    const existing = await PlantDAO.getPlantById(plantId);

    if (!existing) {
      return NextResponse.json(
        { error: "Plant not found" },
        { status: 404 }
      );
    }

    await PlantDAO.updatePlantById(plantId, {
      ...body,
      capacity: body.capacity ? Number(body.capacity) : undefined,
      price: body.price ? Number(body.price) : undefined,
      updatedAt: current_date
    });

    return NextResponse.json({
      success: true,
      message: "Plant updated successfully",
    });
  } catch (error) {
    console.error("Update Plant Error:", error);

    return NextResponse.json(
      { error: "Failed to update plant" },
      { status: 500 }
    );
  }
}
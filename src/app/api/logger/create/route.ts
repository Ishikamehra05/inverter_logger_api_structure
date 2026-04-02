import { NextRequest, NextResponse } from "next/server";
import { inverterDao } from "@/modules/inverter";
import { getAuthenticatedUser } from "@/lib/user_auth";
import { hasPermission } from "@/lib/jwt";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    //  Explicit extraction
    const macaddress = body.macaddress;
    const plantid = body.plantid;

    console.log("details", macaddress,plantid);

    const { success, user, response } = await getAuthenticatedUser(req);

    if (!success || !user) {
      return response;
    }

    const userId = user.userId;

    // permission check
    const canCreate = user.role?.isSuperAdmin || await hasPermission(userId, "create_devices");

    if (!canCreate) {
      return NextResponse.json(
        { error: "Forbidden", message: "No permission to create device" },
        { status: 403 }
      );
    }

    // Validation
    if (!macaddress || !plantid) {
      return NextResponse.json(
        { error: "macaddress and plantId are required" },
        { status: 400 }
      );
    }

    // Call DAO
    const data = await inverterDao.create({
      macaddress,
      plantid,
    });

    return NextResponse.json(
      {
        message: "Inverter created",
        data,
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error.message === "INVALID_PLANT") {
      return NextResponse.json(
        { error: "Plant not found" },
        { status: 404 }
      );
    }

    console.error(error);

    return NextResponse.json(
      { error: "Failed to create inverter" },
      { status: 500 }
    );
  }
}
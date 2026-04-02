import { NextRequest, NextResponse } from "next/server";
import { loggerDao } from "@/modules/logger";
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
        { message: "macaddress and plantId are required" },
        { status: 400 }
      );
    }

    // Call DAO
    const data = await loggerDao.create({
      macaddress,
      plantid,
    });

    return NextResponse.json(
      {
        message: "logger created",
        data,
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error.message === "INVALID_PLANT") {
      return NextResponse.json(
        { message: "Plant not found" },
        { status: 404 }
      );
    }

    console.error(error);

    return NextResponse.json(
      { message: "Failed to create logger" },
      { status: 500 }
    );
  }
}
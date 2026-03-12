import { NextRequest, NextResponse } from "next/server";
import { getDb, type UserRecord } from "@/lib/mongodb";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { suiAddress, googleSub, name, email, role = "admin", orgAdminAddress } = body;

    if (!suiAddress || !googleSub || !name) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const db = await getDb();
    const users = db.collection<UserRecord>("users");
    const existing = await users.findOne({ googleSub });

    if (existing) {
      await users.updateOne(
        { googleSub },
        { $set: { name, email, suiAddress, updatedAt: new Date() } }
      );
      return NextResponse.json({ user: { ...existing, name, email, suiAddress }, isNewUser: false });
    }

    const newUser: UserRecord = {
      suiAddress,
      googleSub,
      name,
      email,
      role,
      hasOrg: false,
      orgAdminAddress,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await users.insertOne(newUser);
    return NextResponse.json({ user: newUser, isNewUser: true }, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/users]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const address = req.nextUrl.searchParams.get("address");
    if (!address) return NextResponse.json({ error: "Missing address" }, { status: 400 });

    const db = await getDb();
    const user = await db.collection<UserRecord>("users").findOne({ suiAddress: address });
    if (!user) return NextResponse.json({ user: null }, { status: 404 });

    return NextResponse.json({ user });
  } catch (err: any) {
    console.error("[GET /api/users]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { suiAddress, hasOrg, orgName, name } = body;
    if (!suiAddress) return NextResponse.json({ error: "Missing suiAddress" }, { status: 400 });

    const db = await getDb();
    const update: Partial<UserRecord> & { updatedAt: Date } = { updatedAt: new Date() };
    if (hasOrg !== undefined) update.hasOrg = !!hasOrg;
    if (orgName !== undefined) update.orgName = orgName;
    if (name !== undefined) update.name = name;

    await db.collection<UserRecord>("users").updateOne({ suiAddress }, { $set: update });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[PATCH /api/users]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

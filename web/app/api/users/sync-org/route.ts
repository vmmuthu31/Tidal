import { NextRequest, NextResponse } from "next/server";
import { SuiJsonRpcClient } from "@mysten/sui/jsonRpc";
import { getDb, type UserRecord } from "@/lib/mongodb";
import { getCurrentPackageId, getCurrentRpcEndpoint } from "@/lib/config/contracts";

const suiClient = new SuiJsonRpcClient({ url: getCurrentRpcEndpoint(), network: "testnet" }) as any;
const _PACKAGE_ID = getCurrentPackageId(); // kept for reference

/**
 * GET /api/users/sync-org?address=0x...
 *
 * Scans the user's on-chain transaction history for a create_org_and_registry call,
 * extracts the resulting OrgAccessRegistry object ID, and saves it to their user record.
 * Returns { orgRegistryId } on success.
 */
export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address");
  if (!address) {
    return NextResponse.json({ error: "Missing address" }, { status: 400 });
  }

  try {
    // Walk through the user's transactions (newest first) looking for the one
    // that created their OrgAccessRegistry shared object.
    let cursor: string | null | undefined = undefined;
    let orgRegistryId: string | null = null;

    outer: for (let page = 0; page < 10; page++) {
      const result = await suiClient.queryTransactionBlocks({
        filter: { FromAddress: address },
        options: { showObjectChanges: true },
        limit: 50,
        cursor,
        order: "descending",
      });

      for (const tx of result.data) {
        const created = tx.objectChanges?.find(
          (c: any) =>
            c.type === "created" &&
            typeof c.objectType === "string" &&
            c.objectType.includes("OrgAccessRegistry")
        ) as any;

        if (created?.objectId) {
          orgRegistryId = created.objectId;
          break outer;
        }
      }

      if (!result.hasNextPage) break;
      cursor = result.nextCursor ?? undefined;
    }

    if (!orgRegistryId) {
      return NextResponse.json({ orgRegistryId: null });
    }

    // Persist so future requests don't need to re-scan
    const db = await getDb();
    await db
      .collection<UserRecord>("users")
      .updateOne({ suiAddress: address }, { $set: { orgRegistryId, updatedAt: new Date() } });

    return NextResponse.json({ orgRegistryId });
  } catch (err: any) {
    console.error("[GET /api/users/sync-org]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

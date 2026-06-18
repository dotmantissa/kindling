import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import { getGenLayerClient, CONTRACT_ADDRESS, isContractDeployed } from "@/lib/genlayer";
import { TransactionStatus } from "genlayer-js/types";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { creator_address } = await req.json();

    const [campaign] = await sql`SELECT * FROM campaigns WHERE id = ${id}`;
    if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (campaign.creator_address.toLowerCase() !== creator_address?.toLowerCase()) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    if (campaign.status !== "active") {
      return NextResponse.json({ error: "Cannot cancel" }, { status: 400 });
    }

    if (isContractDeployed()) {
      const client = getGenLayerClient();
      const tx = await client.writeContract({
        address: CONTRACT_ADDRESS,
        functionName: "cancel_campaign",
        args: [campaign.contract_id],
      });
      await client.waitForTransactionReceipt({
        hash: tx,
        status: TransactionStatus.FINALIZED,
      });
    }

    await sql`UPDATE campaigns SET status = 'cancelled' WHERE id = ${id}`;
    const [updated] = await sql`SELECT * FROM campaigns WHERE id = ${id}`;
    return NextResponse.json({ campaign: updated });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

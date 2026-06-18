import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";
import { getGenLayerClient, CONTRACT_ADDRESS, isContractDeployed } from "@/lib/genlayer";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const creator = searchParams.get("creator");
    const backer = searchParams.get("backer");
    const status = searchParams.get("status");
    const category = searchParams.get("category");

    let query = `SELECT * FROM campaigns WHERE 1=1`;
    const params: string[] = [];
    let i = 1;

    if (creator) {
      query += ` AND LOWER(creator_address) = LOWER($${i++})`;
      params.push(creator);
    }
    if (backer) {
      query += ` AND id IN (SELECT campaign_id FROM backers WHERE LOWER(backer_address) = LOWER($${i++}))`;
      params.push(backer);
    }
    if (status) {
      query += ` AND status = $${i++}`;
      params.push(status);
    }
    if (category) {
      query += ` AND category = $${i++}`;
      params.push(category);
    }
    query += ` ORDER BY created_at DESC`;

    const campaigns = await sql(query, params);
    return NextResponse.json({ campaigns });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      title,
      description,
      goal_wei,
      deadline,
      image_url,
      category,
      creator_address,
      milestones,
    } = body;

    if (!title || !description || !goal_wei || !deadline || !creator_address) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const now = new Date().toISOString();
    let contract_id = `c${Date.now()}`;
    let tx_hash = "";

    if (isContractDeployed()) {
      const client = getGenLayerClient();

      // Read current count to predict the contract_id
      try {
        const countRaw = await client.readContract({
          address: CONTRACT_ADDRESS,
          functionName: "get_campaign_count",
          args: [],
        });
        contract_id = `c${String(countRaw)}`;
      } catch (_) {
        // fall back to timestamp-based id
      }

      // Submit tx and return immediately — no waiting for finalization
      const writeTx = await client.writeContract({
        address: CONTRACT_ADDRESS,
        functionName: "create_campaign",
        args: [
          title,
          description,
          goal_wei,
          deadline,
          image_url || "",
          category || "general",
          now,
        ],
      });
      tx_hash = writeTx;
    }

    const id = `campaign_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    await sql`
      INSERT INTO campaigns (
        id, contract_id, creator_address, title, description,
        goal_wei, raised_wei, backer_count, deadline, image_url,
        category, status, created_at, milestone_count, tx_hash
      ) VALUES (
        ${id}, ${contract_id}, ${creator_address}, ${title}, ${description},
        ${goal_wei}, '0', 0, ${deadline}, ${image_url || ""},
        ${category || "general"}, 'active', ${now}, ${milestones?.length || 0}, ${tx_hash}
      )
    `;

    if (milestones && milestones.length > 0) {
      for (let idx = 0; idx < milestones.length; idx++) {
        const m = milestones[idx];
        const mid = `m${Date.now()}_${idx}`;
        const contract_milestone_id = `m${idx}`;
        let mTxHash = "";

        if (isContractDeployed()) {
          const client = getGenLayerClient();
          // Submit milestone tx without waiting
          try {
            const mTx = await client.writeContract({
              address: CONTRACT_ADDRESS,
              functionName: "add_milestone",
              args: [
                contract_id,
                contract_milestone_id,
                m.title,
                m.description,
                m.target_amount_wei || "0",
                m.due_date,
              ],
            });
            mTxHash = mTx;
          } catch (_) {
            // milestone tx failed to submit — record still goes to DB
          }
        }

        await sql`
          INSERT INTO milestones (
            id, campaign_id, contract_milestone_id, title, description,
            target_amount_wei, due_date, status, order_index
          ) VALUES (
            ${mid}, ${id}, ${contract_milestone_id}, ${m.title}, ${m.description},
            ${m.target_amount_wei || "0"}, ${m.due_date}, 'pending', ${idx}
          )
        `;
      }
    }

    const [campaign] = await sql`SELECT * FROM campaigns WHERE id = ${id}`;
    const dbMilestones = await sql`SELECT * FROM milestones WHERE campaign_id = ${id} ORDER BY order_index`;

    return NextResponse.json({ campaign, milestones: dbMilestones, tx_hash }, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

import { createClient, createAccount, chains } from 'genlayer-js';
import { TransactionStatus } from 'genlayer-js/types';
import { writeFileSync } from 'fs';

const PRIVATE_KEY = '0xd4479070c2a31da31a01e732ca51707132bacdb480aae432a0c8bd0b91eba4b7';

const MINIMAL_CONTRACT = `# v0.2.16
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *

class KindlingCampaign(gl.Contract):
    campaign_count: u256
    test_map: TreeMap[str, str]

    def __init__(self):
        self.campaign_count = u256(0)

    @gl.public.write
    def ping(self, msg: str) -> None:
        self.test_map[msg] = msg

    @gl.public.view
    def get_count(self) -> str:
        return str(int(self.campaign_count))
`;

async function main() {
  const account = createAccount(PRIVATE_KEY);
  const client = createClient({ chain: chains.studionet, account });

  console.log('Deploying minimal contract...');
  const txHash = await client.deployContract({ code: MINIMAL_CONTRACT, args: [] });
  console.log('Tx:', txHash);

  let receipt = null;
  for (let i = 0; i < 60; i++) {
    try {
      receipt = await client.waitForTransactionReceipt({
        hash: txHash, status: TransactionStatus.FINALIZED,
        retries: 2, interval: 3000,
      });
      break;
    } catch (_) { await new Promise(r => setTimeout(r, 5000)); }
  }

  if (!receipt) { console.log('Timed out'); return; }

  const addr = receipt?.to_address || receipt?.data?.contract_address;
  const leader = receipt?.consensus_data?.leader_receipt?.[0];
  const execResult = leader?.execution_result;
  const stderr = leader?.genvm_result?.stderr || leader?.stderr || '';
  const rawErr = leader?.genvm_result?.raw_error;

  console.log('Address:', addr);
  console.log('Result:', execResult);
  console.log('Stderr:', stderr);
  console.log('Raw error:', JSON.stringify(rawErr));

  if (execResult === 'SUCCESS') {
    console.log('\nMinimal contract works! Now testing read...');
    try {
      const count = await client.readContract({
        address: addr,
        functionName: 'get_count',
        args: [],
      });
      console.log('Count:', count);
    } catch (e) { console.log('Read error:', e.message); }
  }
}

main().catch(console.error);

import { createClient, createAccount, chains } from 'genlayer-js';
import { TransactionStatus } from 'genlayer-js/types';

const PRIVATE_KEY = '0xd4479070c2a31da31a01e732ca51707132bacdb480aae432a0c8bd0b91eba4b7';
const CONTRACT = '0xa50cced1C7e7C73C2a148a22D9bba403D7e8c76E';

async function main() {
  const account = createAccount(PRIVATE_KEY);
  const client = createClient({ chain: chains.studionet, account });

  // Try reading the contract count
  console.log('Testing readContract get_campaign_count...');
  try {
    const count = await client.readContract({
      address: CONTRACT,
      functionName: 'get_campaign_count',
      args: [],
    });
    console.log('Campaign count:', count);
  } catch (e) {
    console.log('Read failed:', e.message);
  }

  // Try writing (create a test campaign)
  console.log('\nTesting writeContract create_campaign...');
  try {
    const txHash = await client.writeContract({
      address: CONTRACT,
      functionName: 'create_campaign',
      args: [
        'Test Campaign',
        'A test',
        '1000000000000000000',
        '2025-12-31T00:00:00.000Z',
        '',
        'Tech',
        new Date().toISOString(),
      ],
    });
    console.log('Write tx:', txHash);

    const receipt = await client.waitForTransactionReceipt({
      hash: txHash,
      status: TransactionStatus.FINALIZED,
      retries: 30,
      interval: 5000,
    });
    const leader = receipt?.consensus_data?.leader_receipt?.[0];
    console.log('Execution:', leader?.execution_result);
    console.log('Stderr:', leader?.genvm_result?.stderr);
    console.log('Error desc:', leader?.genvm_result?.error_description);
    console.log('Raw error:', JSON.stringify(leader?.genvm_result?.raw_error));
  } catch (e) {
    console.log('Write failed:', e.message);
  }
}

main().catch(console.error);

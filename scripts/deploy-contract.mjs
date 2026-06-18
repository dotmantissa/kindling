import { createClient, createAccount, chains } from 'genlayer-js';
import { TransactionStatus } from 'genlayer-js/types';
import { readFileSync } from 'fs';

const PRIVATE_KEY = '0xd4479070c2a31da31a01e732ca51707132bacdb480aae432a0c8bd0b91eba4b7';

async function pollReceipt(client, txHash) {
  for (let i = 0; i < 90; i++) {
    try {
      const receipt = await client.waitForTransactionReceipt({
        hash: txHash,
        status: TransactionStatus.FINALIZED,
        retries: 2,
        interval: 4000,
      });
      return receipt;
    } catch (_) {
      await new Promise(r => setTimeout(r, 6000));
      if (i % 5 === 4) console.log(`  Still polling... (${(i+1) * 6}s elapsed)`);
    }
  }
  return null;
}

async function deployWithRetry(client, code, retries = 10) {
  for (let i = 0; i < retries; i++) {
    try {
      return await client.deployContract({ code, args: [] });
    } catch (e) {
      if (i < retries - 1) {
        console.log(`  Network error, retrying in 10s... (attempt ${i + 1}/${retries})`);
        await new Promise(r => setTimeout(r, 10000));
      } else {
        throw e;
      }
    }
  }
}

async function main() {
  const account = createAccount(PRIVATE_KEY);
  const client = createClient({ chain: chains.studionet, account });
  const code = readFileSync('./contracts/KindlingCampaign.py', 'utf8');

  console.log('Deploying KindlingCampaign to studionet...');
  const txHash = await deployWithRetry(client, code);
  console.log('Deploy tx:', txHash);

  const receipt = await pollReceipt(client, txHash);
  if (!receipt) {
    console.log('Timed out — check manually:', txHash);
    return;
  }

  const addr = receipt?.to_address || receipt?.data?.contract_address;
  const leader = receipt?.consensus_data?.leader_receipt?.[0];
  const execResult = leader?.execution_result ?? 'unknown';

  console.log('\n=== RESULT ===');
  console.log('Contract address:', addr);
  console.log('Execution:', execResult);
  if (execResult === 'ERROR') {
    console.log('Stderr:', leader?.genvm_result?.stderr);
    console.log('Error code:', leader?.genvm_result?.error_code);
    console.log('Error desc:', leader?.genvm_result?.error_description);
    console.log('Raw error:', JSON.stringify(leader?.genvm_result?.raw_error));
  }
  console.log('\nCONTRACT_ADDRESS=' + addr);
}

main().catch(e => { console.error('Deploy failed:', e.message); process.exit(1); });

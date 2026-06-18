import { createClient, createAccount, chains } from 'genlayer-js';

const PRIVATE_KEY = '0xd4479070c2a31da31a01e732ca51707132bacdb480aae432a0c8bd0b91eba4b7';
const account = createAccount(PRIVATE_KEY);
const client = createClient({ chain: chains.studionet, account });

// Check beacon contract that was previously deployed successfully
const BEACON = '0xbb1551083d88cdC48438a0024626E4Fd292e5A7C';
try {
  const result = await client.readContract({
    address: BEACON,
    functionName: 'get_total_incidents',
    args: [],
  });
  console.log('Beacon responds, total_incidents:', result);
} catch(e) {
  console.log('Beacon read failed:', e.message);
}

// Check full KindlingCampaign
const CONTRACT = '0x140809D9A0bD65E841b6e5d694D1eE8a2bA7160a';
try {
  const result2 = await client.readContract({
    address: CONTRACT,
    functionName: 'get_campaign_count',
    args: [],
  });
  console.log('KindlingCampaign responds, campaign_count:', result2);
} catch(e) {
  console.log('KindlingCampaign read failed:', e.message);
}

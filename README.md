# Kindling

Most crowdfunding campaigns end the same way. A creator gets the money, updates go quiet, and a year later you're leaving a comment that no one reads asking what happened to that thing you paid for.

Kindling is different because the money never actually goes to the creator until they can prove they deserve it.

## What it does

You back a project. Your funds go into escrow on the GenLayer network. The creator breaks their work into milestones (real, verifiable checkpoints) and has to hit each one to unlock each payment.

When a milestone is submitted, the GenLayer AI validator network reads the evidence and decides whether it genuinely matches what was promised. Not vibes. Not self-reported updates. Actual verification against the stated deliverable.

If the AI says yes, the funds release. If it says no, the milestone goes to a vote. Backers (weighted by how much they put in) decide whether the creator gets another shot or everyone gets their money back.

Creators who ship build a track record on the chain. Creators who don't... well, they don't get to run another campaign.

## Tech stack

- **GenLayer Studio Network**: where the contracts live and the AI verification happens
- **Next.js 15**: the frontend and API layer
- **Privy**: wallet connections and embedded wallets for people who don't own a hardware wallet yet
- **Neon Postgres**: off-chain storage for campaign metadata and fast querying
- **Framer Motion**: the transitions that make it feel like someone actually cared
- **Lucide React**: icons that aren't emoji

## How to run it locally

Clone the repo, then:

```bash
npm install
```

Copy the example env file and fill in your values:

```bash
cp .env.example .env.local
```

Initialize the database:

```bash
node scripts/db-init.mjs
```

Deploy the GenLayer contract:

```bash
genlayer deploy contracts/KindlingCampaign.py --network studionet
```

Put the contract address in your `.env.local` as `CONTRACT_ADDRESS`, then:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Environment variables

| Variable | What it is |
|---|---|
| `NEXT_PUBLIC_PRIVY_APP_ID` | Your Privy app ID |
| `PRIVY_APP_SECRET` | Privy app secret (server only) |
| `DATABASE_URL` | Neon Postgres connection string |
| `NEXT_PUBLIC_GENLAYER_RPC` | GenLayer Studio RPC endpoint |
| `NEXT_PUBLIC_CHAIN_ID` | Chain ID (61999 for studionet) |
| `DEPLOYER_PRIVATE_KEY` | The wallet that deploys and calls contracts |
| `DEPLOYER_KEY_PASSWORD` | Keystore password for the deployer wallet |
| `CONTRACT_ADDRESS` | The deployed KindlingCampaign contract address |

## The contract

`contracts/KindlingCampaign.py` is a GenLayer intelligent contract written in Python. It handles:

- Campaign creation with milestone definitions
- Fund escrow tracking
- Milestone submission and AI verification
- Stake weighted backer voting when AI rejects
- Vote finalization and outcome determination
- Refund claims when campaigns fail

The AI verification uses `gl.nondet.web.get()` to fetch evidence from the submitted URL and `gl.nondet.exec_prompt()` to reason about whether it matches the stated deliverable. The `eq_principle_prompt_comparative` wrapper ensures all GenLayer validators reach the same verdict before the state changes.

## License

MIT. Build on it.

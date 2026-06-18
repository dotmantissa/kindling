import { createClient, createAccount, chains } from "genlayer-js";

const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY as `0x${string}`;

export function getGenLayerClient() {
  const account = createAccount(PRIVATE_KEY);
  return createClient({
    chain: chains.studionet,
    account,
  });
}

export function getPublicClient() {
  return createClient({
    chain: chains.studionet,
  });
}

export const CONTRACT_ADDRESS =
  (process.env.CONTRACT_ADDRESS as `0x${string}`) || "0x";

export function isContractDeployed() {
  return (
    CONTRACT_ADDRESS &&
    CONTRACT_ADDRESS !== "0x" &&
    CONTRACT_ADDRESS.length === 42
  );
}

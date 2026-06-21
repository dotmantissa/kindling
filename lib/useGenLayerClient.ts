"use client";

import { useWallets } from "@privy-io/react-auth";
import { createClient, chains } from "genlayer-js";

export function useGenLayerClient() {
  const { wallets } = useWallets();

  // Prefer external wallet (user explicitly connected); fall back to embedded
  const embeddedWallet = wallets.find((w) => w.walletClientType === "privy");
  const externalWallet = wallets.find((w) => w.walletClientType !== "privy");
  const signingWallet = externalWallet || embeddedWallet;

  const getClient = async () => {
    if (!signingWallet) throw new Error("No wallet connected");

    // Switch to studionet so signatures carry chainId 61999
    try {
      await signingWallet.switchChain(61999);
    } catch (_) {
      // Already on chain, or switching unsupported for this wallet type — proceed
    }

    const provider = await signingWallet.getEthereumProvider();

    // genlayer-js routes eth_sendTransaction through `provider` when account is an Address
    return createClient({
      chain: chains.studionet,
      account: signingWallet.address as `0x${string}`,
      provider,
    });
  };

  return {
    getClient,
    embeddedAddress: embeddedWallet?.address as `0x${string}` | undefined,
    signingAddress: signingWallet?.address as `0x${string}` | undefined,
    hasExternalWallet: !!externalWallet,
  };
}

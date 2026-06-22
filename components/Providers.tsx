"use client";

import { useEffect } from "react";
import { PrivyProvider, usePrivy, useWallets, useCreateWallet } from "@privy-io/react-auth";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import type { Chain } from "viem";

const studionet: Chain = {
  id: 61999,
  name: "GenLayer Studionet",
  nativeCurrency: { name: "GEN Token", symbol: "GEN", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://studio.genlayer.com/api"] },
  },
};

// Silently creates an embedded wallet for any authenticated user who doesn't have one.
// Covers accounts created before the createOnLogin config was set correctly.
function WalletBootstrap() {
  const { authenticated } = usePrivy();
  const { wallets, ready: walletsReady } = useWallets();
  const { createWallet } = useCreateWallet();

  const hasEmbedded = wallets.some(
    (w) => w.walletClientType === "privy" && w.connectorType === "embedded" && !w.imported
  );

  useEffect(() => {
    if (!authenticated || !walletsReady || hasEmbedded) return;
    createWallet().catch(() => {});
  }, [authenticated, walletsReady, hasEmbedded]);

  return null;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <PrivyProvider
        appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
        config={{
          loginMethods: ["email", "wallet"],
          defaultChain: studionet,
          supportedChains: [studionet],
          appearance: {
            theme: "dark",
            accentColor: "#003dad",
            logo: "/logo.svg",
          },
          embeddedWallets: {
            ethereum: {
              createOnLogin: "all-users",
            },
          },
        }}
      >
        {children}
        <WalletBootstrap />
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              color: "var(--fg)",
            },
          }}
        />
      </PrivyProvider>
    </ThemeProvider>
  );
}

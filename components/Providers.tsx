"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <PrivyProvider
        appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
        config={{
          loginMethods: ["email"],
          appearance: {
            theme: "dark",
            accentColor: "#003dad",
            logo: "/logo.svg",
          },
          embeddedWallets: {
            createOnLogin: "all-users",
          },
        }}
      >
        {children}
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

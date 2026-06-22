"use client";

import Link from "next/link";
import Image from "next/image";
import { usePrivy, useWallets, useConnectWallet } from "@privy-io/react-auth";
import { useTheme } from "next-themes";
import { useEffect, useState, useCallback, useRef } from "react";
import { formatGEN } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sun,
  Moon,
  Plus,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  X,
  Copy,
  Check,
  Wallet,
  ExternalLink,
} from "lucide-react";

export default function Navbar() {
  const { ready, authenticated, user, login, logout } = usePrivy();
  const { wallets } = useWallets();
  const { connectWallet } = useConnectWallet();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [copied, setCopied] = useState(false);
  const [balance, setBalance] = useState<string | null>(null);
  const balanceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setMounted(true);
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!accountOpen) return;
    const close = (e: MouseEvent) => {
      if (!(e.target as Element).closest("[data-account-menu]")) {
        setAccountOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [accountOpen]);

  const embeddedWallet = wallets.find(
    (w) => w.walletClientType === "privy" && w.connectorType === "embedded" && !w.imported
  );
  const externalWallet = wallets.find((w) => w.walletClientType !== "privy");

  // user.wallet is Privy's embedded wallet — set immediately after auth
  // before useWallets() finishes its async initialization.
  const embeddedAddress = embeddedWallet?.address ?? user?.wallet?.address;

  // The address whose balance matters is the one being used for signing.
  const signingAddress = externalWallet?.address ?? embeddedAddress;

  const fetchBalance = useCallback(async (address: string) => {
    try {
      const res = await fetch("https://studio.genlayer.com/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "eth_getBalance",
          params: [address, "latest"],
          id: 1,
        }),
      });
      const { result } = await res.json();
      if (result) setBalance(formatGEN(BigInt(result)));
    } catch {
      // network hiccup — keep showing last known balance
    }
  }, []);

  useEffect(() => {
    if (balanceTimerRef.current) clearInterval(balanceTimerRef.current);
    if (!signingAddress) { setBalance(null); return; }
    fetchBalance(signingAddress);
    balanceTimerRef.current = setInterval(() => fetchBalance(signingAddress), 30_000);
    return () => {
      if (balanceTimerRef.current) clearInterval(balanceTimerRef.current);
    };
  }, [signingAddress, fetchBalance]);

  const userEmail = user?.email?.address;
  const displayName = userEmail ? userEmail.split("@")[0] : "Account";

  const copyAddress = useCallback(async (addr: string) => {
    await navigator.clipboard.writeText(addr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  const shortAddr = (addr: string) =>
    `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  return (
    <header
      className="sticky top-0 z-50 transition-all duration-300"
      style={{
        background: scrolled ? "var(--bg-card)" : "var(--bg)",
        borderBottom: scrolled ? "1px solid var(--border)" : "1px solid transparent",
        backdropFilter: scrolled ? "blur(12px)" : "none",
      }}
    >
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
          <div className="w-8 h-8 flame-logo">
            <Image src="/logo.svg" alt="Kindling" width={32} height={32} />
          </div>
          <span
            className="text-xl font-bold tracking-tight"
            style={{ color: "var(--fg)" }}
          >
            Kindling
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          <NavLink href="/campaigns">Browse</NavLink>
          {authenticated && <NavLink href="/dashboard">Dashboard</NavLink>}
        </div>

        <div className="hidden md:flex items-center gap-3">
          {/* Theme toggle */}
          {mounted && (
            <button
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-110"
              style={{ background: "var(--bg-secondary)", color: "var(--fg-muted)" }}
              aria-label="Toggle theme"
            >
              {resolvedTheme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          )}

          {ready && (
            <>
              {authenticated ? (
                <div className="flex items-center gap-2">
                  <Link
                    href="/create"
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 hover:opacity-90 active:scale-95"
                    style={{ background: "var(--brand)", color: "#fff" }}
                  >
                    <Plus size={15} />
                    Start a campaign
                  </Link>
                  <div className="relative" data-account-menu>
                    <button
                      onClick={() => setAccountOpen((o) => !o)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 hover:opacity-80"
                      style={{
                        background: "var(--bg-secondary)",
                        color: "var(--fg-muted)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      <Mail size={14} />
                      {displayName}
                    </button>
                    <AnimatePresence>
                      {accountOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.15 }}
                          className="absolute right-0 top-full mt-2 w-60 rounded-xl overflow-hidden shadow-lg z-50"
                          style={{
                            background: "var(--bg-card)",
                            border: "1px solid var(--border)",
                          }}
                        >
                          {/* Email */}
                          {userEmail && (
                            <div
                              className="px-4 py-3 text-xs truncate"
                              style={{ color: "var(--fg-muted)", borderBottom: "1px solid var(--border)" }}
                            >
                              {userEmail}
                            </div>
                          )}

                          {/* Wallet section */}
                          <div
                            className="px-4 py-3 space-y-2"
                            style={{ borderBottom: "1px solid var(--border)" }}
                          >
                            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--fg-muted)" }}>
                              {externalWallet ? "External wallet" : "Your wallet"}
                            </p>
                            {externalWallet ? (
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-xs font-mono" style={{ color: "var(--fg)" }}>
                                    {shortAddr(externalWallet.address)}
                                  </span>
                                  <button
                                    onClick={() => copyAddress(externalWallet.address)}
                                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-colors hover:bg-[var(--bg-secondary)]"
                                    style={{ color: "var(--brand)" }}
                                    title="Copy address"
                                  >
                                    {copied ? <Check size={11} /> : <Copy size={11} />}
                                    {copied ? "Copied" : "Copy"}
                                  </button>
                                </div>
                                {balance && (
                                  <p className="text-xs font-semibold" style={{ color: "var(--fg)" }}>
                                    {balance}
                                  </p>
                                )}
                              </div>
                            ) : embeddedAddress ? (
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-xs font-mono" style={{ color: "var(--fg)" }}>
                                    {shortAddr(embeddedAddress)}
                                  </span>
                                  <button
                                    onClick={() => copyAddress(embeddedAddress)}
                                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-colors hover:bg-[var(--bg-secondary)]"
                                    style={{ color: "var(--brand)" }}
                                    title="Copy address"
                                  >
                                    {copied ? <Check size={11} /> : <Copy size={11} />}
                                    {copied ? "Copied" : "Copy"}
                                  </button>
                                </div>
                                {balance && (
                                  <p className="text-xs font-semibold" style={{ color: "var(--fg)" }}>
                                    {balance}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <p className="text-xs" style={{ color: "var(--fg-muted)" }}>Setting up wallet…</p>
                            )}

                            {/* Internal wallet (always show if external is connected) */}
                            {externalWallet && embeddedAddress && (
                              <div className="pt-1">
                                <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--fg-muted)" }}>
                                  Internal wallet
                                </p>
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-xs font-mono" style={{ color: "var(--fg)" }}>
                                    {shortAddr(embeddedAddress)}
                                  </span>
                                  <button
                                    onClick={() => copyAddress(embeddedAddress)}
                                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-colors hover:bg-[var(--bg-secondary)]"
                                    style={{ color: "var(--brand)" }}
                                    title="Copy address"
                                  >
                                    <Copy size={11} />
                                    Copy
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Connect / disconnect external wallet */}
                            {!externalWallet ? (
                              <button
                                onClick={() => { connectWallet(); setAccountOpen(false); }}
                                className="flex items-center gap-1.5 text-xs transition-colors hover:opacity-80 mt-1"
                                style={{ color: "var(--brand)" }}
                              >
                                <ExternalLink size={11} />
                                Connect external wallet
                              </button>
                            ) : (
                              <p className="text-xs mt-1" style={{ color: "var(--fg-muted)" }}>
                                Signing with external wallet
                              </p>
                            )}
                          </div>

                          {/* Nav links */}
                          <Link
                            href="/dashboard"
                            onClick={() => setAccountOpen(false)}
                            className="flex items-center gap-2 px-4 py-3 text-sm hover:bg-[var(--bg-secondary)] transition-colors"
                            style={{ color: "var(--fg)" }}
                          >
                            <LayoutDashboard size={14} />
                            Dashboard
                          </Link>
                          <button
                            onClick={() => { logout(); setAccountOpen(false); }}
                            className="w-full flex items-center gap-2 px-4 py-3 text-sm hover:bg-[var(--bg-secondary)] transition-colors"
                            style={{ color: "var(--fg-muted)" }}
                          >
                            <LogOut size={14} />
                            Sign out
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => login()}
                  className="px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 hover:opacity-90 active:scale-95"
                  style={{ background: "var(--brand)", color: "#fff" }}
                >
                  Sign in
                </button>
              )}
            </>
          )}
        </div>

        {/* Mobile: theme + hamburger */}
        <div className="flex md:hidden items-center gap-2">
          {mounted && (
            <button
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "var(--bg-secondary)", color: "var(--fg-muted)" }}
            >
              {resolvedTheme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          )}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "var(--bg-secondary)", color: "var(--fg)" }}
          >
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden overflow-hidden"
            style={{ borderTop: "1px solid var(--border)", background: "var(--bg-card)" }}
          >
            <div className="px-4 py-4 flex flex-col gap-3">
              <Link
                href="/campaigns"
                onClick={() => setMenuOpen(false)}
                className="text-sm font-medium py-2"
                style={{ color: "var(--fg)" }}
              >
                Browse campaigns
              </Link>
              {authenticated && (
                <Link
                  href="/dashboard"
                  onClick={() => setMenuOpen(false)}
                  className="text-sm font-medium py-2"
                  style={{ color: "var(--fg)" }}
                >
                  Dashboard
                </Link>
              )}

              {/* Mobile wallet display */}
              {authenticated && (embeddedAddress || externalWallet) && (
                <div
                  className="py-3 space-y-2 rounded-xl px-3"
                  style={{ background: "var(--bg-secondary)" }}
                >
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--fg-muted)" }}>
                    {externalWallet ? "External wallet" : "Your wallet"}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono" style={{ color: "var(--fg)" }}>
                      {shortAddr((externalWallet?.address ?? embeddedAddress)!)}
                    </span>
                    <button
                      onClick={() => copyAddress((externalWallet?.address ?? embeddedAddress)!)}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs"
                      style={{ color: "var(--brand)" }}
                    >
                      {copied ? <Check size={11} /> : <Copy size={11} />}
                      {copied ? "Copied" : "Copy"}
                    </button>
                  </div>
                  {balance && (
                    <p className="text-xs font-semibold" style={{ color: "var(--fg)" }}>
                      {balance}
                    </p>
                  )}
                  {externalWallet && embeddedAddress && (
                    <div className="pt-1 border-t" style={{ borderColor: "var(--border)" }}>
                      <p className="text-xs font-semibold uppercase tracking-wider mb-1 pt-1" style={{ color: "var(--fg-muted)" }}>Internal wallet</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono" style={{ color: "var(--fg)" }}>
                          {shortAddr(embeddedAddress)}
                        </span>
                        <button
                          onClick={() => copyAddress(embeddedAddress)}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs"
                          style={{ color: "var(--brand)" }}
                        >
                          <Copy size={11} />
                          Copy
                        </button>
                      </div>
                    </div>
                  )}
                  {!externalWallet && (
                    <button
                      onClick={() => { connectWallet(); setMenuOpen(false); }}
                      className="flex items-center gap-1.5 text-xs"
                      style={{ color: "var(--brand)" }}
                    >
                      <Wallet size={11} />
                      Connect external wallet
                    </button>
                  )}
                </div>
              )}

              {ready && authenticated && (
                <Link
                  href="/create"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-center justify-center"
                  style={{ background: "var(--brand)", color: "#fff" }}
                >
                  <Plus size={15} />
                  Start a campaign
                </Link>
              )}
              {ready && authenticated && (
                <button
                  onClick={() => { logout(); setMenuOpen(false); }}
                  className="text-sm font-medium py-2 text-left"
                  style={{ color: "var(--fg-muted)" }}
                >
                  Sign out
                </button>
              )}
              {ready && !authenticated && (
                <button
                  onClick={() => { login(); setMenuOpen(false); }}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold"
                  style={{ background: "var(--brand)", color: "#fff" }}
                >
                  Sign in
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 hover:bg-[var(--bg-secondary)]"
      style={{ color: "var(--fg-muted)" }}
    >
      {children}
    </Link>
  );
}

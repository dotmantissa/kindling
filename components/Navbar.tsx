"use client";

import Link from "next/link";
import Image from "next/image";
import { usePrivy } from "@privy-io/react-auth";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sun, Moon, Plus, LayoutDashboard, LogOut, Mail, Menu, X } from "lucide-react";

export default function Navbar() {
  const { ready, authenticated, user, login, logout } = usePrivy();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    setMounted(true);
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const userEmail = user?.email?.address;
  const displayName = userEmail
    ? userEmail.split("@")[0]
    : "Account";

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
                  <div className="relative group">
                    <button
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
                    <div
                      className="absolute right-0 top-full mt-2 w-44 rounded-xl overflow-hidden shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-200"
                      style={{
                        background: "var(--bg-card)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      {userEmail && (
                        <div
                          className="px-4 py-3 text-xs truncate"
                          style={{ color: "var(--fg-muted)", borderBottom: "1px solid var(--border)" }}
                        >
                          {userEmail}
                        </div>
                      )}
                      <Link
                        href="/dashboard"
                        className="flex items-center gap-2 px-4 py-3 text-sm hover:bg-[var(--bg-secondary)] transition-colors"
                        style={{ color: "var(--fg)" }}
                      >
                        <LayoutDashboard size={14} />
                        Dashboard
                      </Link>
                      <button
                        onClick={() => logout()}
                        className="w-full flex items-center gap-2 px-4 py-3 text-sm hover:bg-[var(--bg-secondary)] transition-colors"
                        style={{ color: "var(--fg-muted)" }}
                      >
                        <LogOut size={14} />
                        Sign out
                      </button>
                    </div>
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

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck, Flame, Vote, Star, ChevronRight } from "lucide-react";
import { Campaign } from "@/lib/schema";
import CampaignCard from "@/components/CampaignCard";

const STEPS = [
  {
    icon: Flame,
    title: "A creator sparks an idea",
    body: "They lay out the plan, set a funding goal, and break the whole thing into milestones. Not one big promise — a series of checkpoints they actually have to hit.",
  },
  {
    icon: ShieldCheck,
    title: "You back it, but the money doesn't move",
    body: "Funds sit in escrow on the GenLayer network. The creator gets paid in stages, only after each milestone is verified. That's the deal.",
  },
  {
    icon: Vote,
    title: "The AI checks the evidence",
    body: "When a milestone is submitted, an AI verifier reviews the proof — a prototype video, a shipping receipt, whatever was promised. If it checks out, the funds release.",
  },
  {
    icon: Star,
    title: "You vote when it doesn't",
    body: "If the AI isn't convinced, it goes to you — the backers. Stake-weighted voting determines whether the creator earns the funds or everyone gets their money back.",
  },
];

export default function HomePage() {
  const [featured, setFeatured] = useState<Campaign[]>([]);

  useEffect(() => {
    fetch("/api/campaigns?status=active")
      .then((r) => r.json())
      .then((d) => setFeatured((d.campaigns || []).slice(0, 3)))
      .catch(() => {});
  }, []);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% 0%, var(--brand-dim) 0%, transparent 70%)",
          }}
        />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 pt-24 pb-20 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
          >
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-6"
              style={{
                background: "var(--brand-dim)",
                color: "var(--brand)",
                border: "1px solid var(--brand)",
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "var(--brand)" }} />
              Live on GenLayer Studio Network
            </div>

            <h1
              className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight mb-6 leading-[1.05]"
              style={{ color: "var(--fg)" }}
            >
              Back ideas that{" "}
              <span className="gradient-text">actually ship.</span>
            </h1>

            <p
              className="text-xl sm:text-2xl max-w-2xl mx-auto mb-10 leading-relaxed"
              style={{ color: "var(--fg-muted)" }}
            >
              Crowdfunding without the faith. Your money releases in stages, only after the AI confirms each milestone is real. If the creator stalls, you vote on what happens next.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/campaigns"
                className="group flex items-center gap-2 px-7 py-3.5 rounded-2xl text-base font-bold transition-all duration-200 hover:opacity-90 hover:shadow-lg active:scale-95"
                style={{ background: "var(--brand)", color: "#fff" }}
              >
                Browse campaigns
                <ArrowRight
                  size={18}
                  className="transition-transform group-hover:translate-x-1"
                />
              </Link>
              <Link
                href="/create"
                className="flex items-center gap-2 px-7 py-3.5 rounded-2xl text-base font-bold transition-all duration-200 hover:bg-[var(--bg-secondary)] active:scale-95"
                style={{
                  border: "1px solid var(--border)",
                  color: "var(--fg)",
                  background: "var(--bg-card)",
                }}
              >
                Start a campaign
              </Link>
            </div>
          </motion.div>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="mt-16 flex flex-wrap justify-center gap-8"
          >
            {[
              { val: "100%", label: "On-chain accountability" },
              { val: "AI-verified", label: "Milestone proofs" },
              { val: "Stake-weighted", label: "Backer voting" },
            ].map(({ val, label }) => (
              <div key={label} className="text-center">
                <div
                  className="text-2xl font-extrabold"
                  style={{ color: "var(--brand)" }}
                >
                  {val}
                </div>
                <div className="text-sm mt-0.5" style={{ color: "var(--fg-muted)" }}>
                  {label}
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2
            className="text-3xl sm:text-4xl font-extrabold mb-4"
            style={{ color: "var(--fg)" }}
          >
            Here's how it works
          </h2>
          <p className="text-lg max-w-xl mx-auto" style={{ color: "var(--fg-muted)" }}>
            Honestly, it's not complicated. It just hasn't existed before.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {STEPS.map(({ icon: Icon, title, body }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
              className="rounded-2xl p-7 relative overflow-hidden"
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
              }}
            >
              <div
                className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-10 -translate-y-6 translate-x-6"
                style={{ background: "var(--brand)" }}
              />
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                style={{ background: "var(--brand-dim)" }}
              >
                <Icon size={22} style={{ color: "var(--brand)" }} />
              </div>
              <div
                className="text-xs font-bold uppercase tracking-widest mb-2"
                style={{ color: "var(--brand)" }}
              >
                Step {i + 1}
              </div>
              <h3
                className="text-lg font-bold mb-2"
                style={{ color: "var(--fg)" }}
              >
                {title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: "var(--fg-muted)" }}>
                {body}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Featured campaigns */}
      {featured.length > 0 && (
        <section
          className="py-24"
          style={{ background: "var(--bg-secondary)" }}
        >
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between mb-12">
              <div>
                <h2
                  className="text-3xl font-extrabold"
                  style={{ color: "var(--fg)" }}
                >
                  What people are building
                </h2>
                <p className="mt-1 text-base" style={{ color: "var(--fg-muted)" }}>
                  Every single one accountable to its backers.
                </p>
              </div>
              <Link
                href="/campaigns"
                className="group hidden sm:flex items-center gap-1.5 text-sm font-semibold transition-colors"
                style={{ color: "var(--brand)" }}
              >
                View all
                <ChevronRight
                  size={16}
                  className="transition-transform group-hover:translate-x-1"
                />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {featured.map((c, i) => (
                <CampaignCard key={c.id} campaign={c} index={i} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-28 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="rounded-3xl p-12 relative overflow-hidden"
          style={{ background: "var(--brand)", color: "#fff" }}
        >
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white translate-x-16 -translate-y-16" />
            <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-white -translate-x-12 translate-y-12" />
          </div>
          <div className="relative">
            <div className="w-14 h-14 mx-auto mb-6 flame-logo">
              <Image src="/logo.svg" alt="Kindling" width={56} height={56} className="invert" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">
              Got something worth building?
            </h2>
            <p className="text-lg opacity-85 max-w-lg mx-auto mb-8">
              Put it on Kindling. Show your backers the roadmap, hit the milestones, earn the funds. That's the whole thing.
            </p>
            <Link
              href="/create"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-base font-bold transition-all duration-200 hover:opacity-90 active:scale-95"
              style={{ background: "#fff", color: "var(--brand)" }}
            >
              Launch your campaign
              <ArrowRight size={18} />
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer
        className="border-t py-10"
        style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Image src="/logo.svg" alt="Kindling" width={24} height={24} />
            <span className="font-bold text-sm" style={{ color: "var(--fg)" }}>
              Kindling
            </span>
          </div>
          <p className="text-xs" style={{ color: "var(--fg-muted)" }}>
            Built on GenLayer. Accountability is not optional.
          </p>
          <div className="flex items-center gap-4 text-xs" style={{ color: "var(--fg-muted)" }}>
            <Link href="/campaigns" className="hover:text-[var(--brand)] transition-colors">
              Campaigns
            </Link>
            <Link href="/create" className="hover:text-[var(--brand)] transition-colors">
              Create
            </Link>
            <Link href="/dashboard" className="hover:text-[var(--brand)] transition-colors">
              Dashboard
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

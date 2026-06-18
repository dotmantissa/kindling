"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePrivy } from "@privy-io/react-auth";
import { toast } from "sonner";
import Link from "next/link";
import {
  Loader2,
  Upload,
  X,
  ChevronRight,
  LayoutDashboard,
  Flame,
} from "lucide-react";
import { Campaign, Milestone } from "@/lib/schema";
import { formatGEN, pct } from "@/lib/utils";
import CampaignCard from "@/components/CampaignCard";
import ProgressBar from "@/components/ui/ProgressBar";
import StatusBadge from "@/components/ui/StatusBadge";

type Tab = "created" | "backed";

interface CampaignWithMilestones {
  campaign: Campaign;
  milestones: Milestone[];
}

export default function DashboardPage() {
  const { authenticated, user, login } = usePrivy();
  const [tab, setTab] = useState<Tab>("created");
  const [created, setCreated] = useState<CampaignWithMilestones[]>([]);
  const [backed, setBacked] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  const [submitOpen, setSubmitOpen] = useState(false);
  const [submitMilestone, setSubmitMilestone] = useState<{
    campaign: Campaign;
    milestone: Milestone;
  } | null>(null);
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [evidenceDesc, setEvidenceDesc] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const walletAddress = user?.wallet?.address;

  const loadData = async () => {
    if (!walletAddress) return;
    setLoading(true);
    try {
      const [createdRes, backedRes] = await Promise.all([
        fetch(`/api/campaigns?creator=${walletAddress}`),
        fetch(`/api/campaigns?backer=${walletAddress}`),
      ]);
      const createdData = await createdRes.json();
      const backedData = await backedRes.json();

      const createdCampaigns: CampaignWithMilestones[] = await Promise.all(
        (createdData.campaigns || []).map(async (c: Campaign) => {
          const r = await fetch(`/api/campaigns/${c.id}`);
          const d = await r.json();
          return { campaign: c, milestones: d.milestones || [] };
        })
      );
      setCreated(createdCampaigns);
      setBacked(backedData.campaigns || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [walletAddress]);

  const openSubmit = (campaign: Campaign, milestone: Milestone) => {
    setSubmitMilestone({ campaign, milestone });
    setEvidenceUrl("");
    setEvidenceDesc("");
    setSubmitOpen(true);
  };

  const handleSubmitEvidence = async () => {
    if (!submitMilestone) return;
    if (!evidenceUrl.trim()) return toast.error("Provide an evidence URL");
    if (!evidenceDesc.trim()) return toast.error("Describe your evidence");
    setSubmitting(true);
    try {
      const r = await fetch(
        `/api/campaigns/${submitMilestone.campaign.id}/milestones/${submitMilestone.milestone.id}/submit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            evidence_url: evidenceUrl,
            evidence_description: evidenceDesc,
            creator_address: walletAddress,
          }),
        }
      );
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      toast.success("Evidence submitted. The AI will verify it shortly.");
      setSubmitOpen(false);
      await loadData();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (!authenticated) {
    return (
      <div className="max-w-lg mx-auto px-4 py-24 text-center">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
          style={{ background: "var(--brand-dim)" }}
        >
          <LayoutDashboard size={28} style={{ color: "var(--brand)" }} />
        </div>
        <h1 className="text-2xl font-extrabold mb-3" style={{ color: "var(--fg)" }}>
          Your dashboard
        </h1>
        <p className="text-base mb-8" style={{ color: "var(--fg-muted)" }}>
          Connect your wallet to see your campaigns and backing activity.
        </p>
        <button
          onClick={() => login()}
          className="px-6 py-3 rounded-xl font-bold text-sm"
          style={{ background: "var(--brand)", color: "#fff" }}
        >
          Connect wallet
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1
          className="text-3xl font-extrabold mb-1"
          style={{ color: "var(--fg)" }}
        >
          Dashboard
        </h1>
        <p className="text-sm mb-8" style={{ color: "var(--fg-muted)" }}>
          Everything you've started and everything you've backed.
        </p>

        {/* Tab switcher */}
        <div
          className="inline-flex rounded-xl p-1 mb-8"
          style={{ background: "var(--bg-secondary)" }}
        >
          {(["created", "backed"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200"
              style={{
                background: tab === t ? "var(--bg-card)" : "transparent",
                color: tab === t ? "var(--fg)" : "var(--fg-muted)",
                boxShadow: tab === t ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
              }}
            >
              {t === "created" ? "My campaigns" : "My backing"}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={28} className="animate-spin" style={{ color: "var(--brand)" }} />
          </div>
        ) : tab === "created" ? (
          <CreatedTab
            items={created}
            onSubmitEvidence={openSubmit}
          />
        ) : (
          <BackedTab campaigns={backed} />
        )}
      </motion.div>

      {/* Submit evidence modal */}
      <AnimatePresence>
        {submitOpen && submitMilestone && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
            onClick={(e) => e.target === e.currentTarget && setSubmitOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-lg rounded-2xl p-7"
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
              }}
            >
              <div className="flex items-start justify-between mb-5">
                <div>
                  <h2 className="text-lg font-bold" style={{ color: "var(--fg)" }}>
                    Submit milestone evidence
                  </h2>
                  <p className="text-sm mt-1" style={{ color: "var(--fg-muted)" }}>
                    {submitMilestone.milestone.title}
                  </p>
                </div>
                <button
                  onClick={() => setSubmitOpen(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--bg-secondary)] transition-colors"
                  style={{ color: "var(--fg-muted)" }}
                >
                  <X size={16} />
                </button>
              </div>

              <div
                className="p-4 rounded-xl mb-5 text-sm"
                style={{ background: "var(--bg-secondary)", color: "var(--fg-muted)" }}
              >
                <strong style={{ color: "var(--fg)" }}>The deliverable:</strong>{" "}
                {submitMilestone.milestone.description}
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold" style={{ color: "var(--fg-muted)" }}>
                    Evidence URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://... (link to prototype, video, document, etc.)"
                    value={evidenceUrl}
                    onChange={(e) => setEvidenceUrl(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-colors"
                    style={{
                      background: "var(--bg)",
                      border: "1px solid var(--border)",
                      color: "var(--fg)",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "var(--brand)")}
                    onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold" style={{ color: "var(--fg-muted)" }}>
                    Describe your evidence
                  </label>
                  <textarea
                    placeholder="Walk the AI through what you're showing. The clearer you are, the better chance it passes."
                    value={evidenceDesc}
                    onChange={(e) => setEvidenceDesc(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-2.5 rounded-xl text-sm outline-none resize-none transition-colors"
                    style={{
                      background: "var(--bg)",
                      border: "1px solid var(--border)",
                      color: "var(--fg)",
                      fontFamily: "inherit",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "var(--brand)")}
                    onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setSubmitOpen(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all hover:bg-[var(--bg-secondary)]"
                  style={{
                    border: "1px solid var(--border)",
                    color: "var(--fg)",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitEvidence}
                  disabled={submitting}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-90 disabled:opacity-50"
                  style={{ background: "var(--brand)", color: "#fff" }}
                >
                  {submitting ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Upload size={14} />
                  )}
                  Submit
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CreatedTab({
  items,
  onSubmitEvidence,
}: {
  items: CampaignWithMilestones[];
  onSubmitEvidence: (c: Campaign, m: Milestone) => void;
}) {
  if (items.length === 0) {
    return (
      <div className="text-center py-20">
        <Flame
          size={40}
          className="mx-auto mb-4"
          style={{ color: "var(--brand)", opacity: 0.3 }}
        />
        <p className="text-lg font-semibold mb-2" style={{ color: "var(--fg)" }}>
          No campaigns yet
        </p>
        <p className="text-sm mb-6" style={{ color: "var(--fg-muted)" }}>
          Got an idea worth backing? Start here.
        </p>
        <Link
          href="/create"
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-bold"
          style={{ background: "var(--brand)", color: "#fff" }}
        >
          Start a campaign
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {items.map(({ campaign, milestones }) => (
        <div
          key={campaign.id}
          className="rounded-2xl overflow-hidden"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
          }}
        >
          <div className="p-6">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <StatusBadge status={campaign.status} />
                  <span className="text-xs" style={{ color: "var(--fg-muted)" }}>
                    {campaign.category}
                  </span>
                </div>
                <h3 className="text-base font-bold" style={{ color: "var(--fg)" }}>
                  {campaign.title}
                </h3>
              </div>
              <Link
                href={`/campaigns/${campaign.id}`}
                className="shrink-0 flex items-center gap-1 text-xs font-semibold hover:opacity-70 transition-opacity"
                style={{ color: "var(--brand)" }}
              >
                View <ChevronRight size={13} />
              </Link>
            </div>

            <div className="mb-3">
              <ProgressBar value={pct(campaign.raised_wei, campaign.goal_wei)} />
              <div className="mt-1.5 flex justify-between text-xs" style={{ color: "var(--fg-muted)" }}>
                <span>{formatGEN(campaign.raised_wei)} raised</span>
                <span>Goal: {formatGEN(campaign.goal_wei)}</span>
              </div>
            </div>
          </div>

          {milestones.length > 0 && (
            <div style={{ borderTop: "1px solid var(--border)" }}>
              <div className="px-6 py-3">
                <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--fg-muted)" }}>
                  Milestones
                </p>
                <div className="space-y-2">
                  {milestones.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{
                            background:
                              m.status === "approved"
                                ? "#15803d"
                                : m.status === "rejected"
                                ? "#dc2626"
                                : m.status === "submitted" || m.status === "voting"
                                ? "#1d4ed8"
                                : "var(--border)",
                          }}
                        />
                        <span className="text-sm truncate" style={{ color: "var(--fg)" }}>
                          {m.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <StatusBadge status={m.status} />
                        {m.status === "pending" && campaign.status === "funded" && (
                          <button
                            onClick={() => onSubmitEvidence(campaign, m)}
                            className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold transition-all hover:opacity-80"
                            style={{ background: "var(--brand)", color: "#fff" }}
                          >
                            <Upload size={11} />
                            Submit
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function BackedTab({ campaigns }: { campaigns: Campaign[] }) {
  if (campaigns.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-lg font-semibold mb-2" style={{ color: "var(--fg)" }}>
          You haven't backed anything yet
        </p>
        <p className="text-sm mb-6" style={{ color: "var(--fg-muted)" }}>
          Find something worth believing in.
        </p>
        <Link
          href="/campaigns"
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-bold"
          style={{ background: "var(--brand)", color: "#fff" }}
        >
          Browse campaigns
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {campaigns.map((c, i) => (
        <CampaignCard key={c.id} campaign={c} index={i} />
      ))}
    </div>
  );
}

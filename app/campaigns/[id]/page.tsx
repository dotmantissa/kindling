"use client";

import { useEffect, useState, use } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePrivy } from "@privy-io/react-auth";
import { toast } from "sonner";
import {
  Users,
  Clock,
  Target,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { Campaign, Milestone, Backer } from "@/lib/schema";
import { formatGEN, pct, timeLeft, genToWei } from "@/lib/utils";
import ProgressBar from "@/components/ui/ProgressBar";
import StatusBadge from "@/components/ui/StatusBadge";

export default function CampaignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { authenticated, user } = usePrivy();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [backers, setBackers] = useState<Backer[]>([]);
  const [myBacking, setMyBacking] = useState<Backer | null>(null);
  const [loading, setLoading] = useState(true);
  const [backAmount, setBackAmount] = useState("");
  const [backing, setBacking] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const walletAddress = user?.wallet?.address;
  const isCreator =
    campaign &&
    walletAddress &&
    campaign.creator_address.toLowerCase() === walletAddress.toLowerCase();

  const load = async () => {
    const r = await fetch(`/api/campaigns/${id}`);
    if (!r.ok) return;
    const d = await r.json();
    setCampaign(d.campaign);
    setMilestones(d.milestones || []);
    setBackers(d.backers || []);
  };

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!walletAddress || !id) return;
    fetch(`/api/campaigns/${id}/backer?address=${walletAddress}`)
      .then((r) => r.json())
      .then((d) => setMyBacking(d.backer || null));
  }, [id, walletAddress]);

  const handleBack = async () => {
    if (!walletAddress) return toast.error("Sign in to back this campaign");
    const gen = parseFloat(backAmount);
    if (!gen || gen <= 0) return toast.error("Enter a valid amount");
    setBacking(true);
    try {
      const r = await fetch(`/api/campaigns/${id}/back`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          backer_address: walletAddress,
          amount_wei: genToWei(gen),
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      toast.success(`You backed this campaign with ${gen} GEN`);
      setBackAmount("");
      await load();
      setMyBacking(d.backer);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBacking(false);
    }
  };

  const handleMilestoneAction = async (
    mid: string,
    action: "verify" | "vote-approve" | "vote-reject" | "finalize",
    extra?: Record<string, unknown>
  ) => {
    setActionLoading(`${mid}-${action}`);
    try {
      const m = milestones.find((x) => x.id === mid)!;
      let url = `/api/campaigns/${id}/milestones/${mid}`;
      let body: Record<string, unknown> = {};

      if (action === "verify") {
        url += "/verify";
      } else if (action === "vote-approve" || action === "vote-reject") {
        url += "/vote";
        body = { voter_address: walletAddress, approve: action === "vote-approve" };
      } else if (action === "finalize") {
        url += "/finalize";
      }

      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);

      const labels: Record<string, string> = {
        verify: "Verification triggered",
        "vote-approve": "Vote cast. You approved.",
        "vote-reject": "Vote cast. You rejected.",
        finalize: "Vote finalized",
      };
      toast.success(labels[action]);
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRefund = async () => {
    if (!walletAddress) return;
    setActionLoading("refund");
    try {
      const r = await fetch(`/api/campaigns/${id}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ backer_address: walletAddress }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      toast.success(`Refund processed: ${formatGEN(d.amount_wei)}`);
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Refund failed");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={32} className="animate-spin" style={{ color: "var(--brand)" }} />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 text-center">
        <h1 className="text-2xl font-bold mb-2" style={{ color: "var(--fg)" }}>
          Campaign not found
        </h1>
        <Link href="/campaigns" className="text-sm" style={{ color: "var(--brand)" }}>
          Back to campaigns
        </Link>
      </div>
    );
  }

  const progress = pct(campaign.raised_wei, campaign.goal_wei);
  const remaining = timeLeft(campaign.deadline);
  const hasImage = campaign.image_url?.startsWith("http");
  const canBack = campaign.status === "active" && authenticated;
  const canRefund =
    ["failed", "cancelled"].includes(campaign.status) &&
    myBacking &&
    !myBacking.refunded;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <Link
        href="/campaigns"
        className="inline-flex items-center gap-1.5 text-sm mb-8 hover:opacity-70 transition-opacity"
        style={{ color: "var(--fg-muted)" }}
      >
        <ArrowLeft size={14} />
        All campaigns
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main */}
        <div className="lg:col-span-2 space-y-8">
          {/* Image */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="rounded-2xl overflow-hidden h-64 sm:h-80"
            style={{
              background: "var(--brand-dim)",
              border: "1px solid var(--border)",
            }}
          >
            {hasImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={campaign.image_url}
                alt={campaign.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Target size={48} style={{ color: "var(--brand)", opacity: 0.3 }} />
              </div>
            )}
          </motion.div>

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05, duration: 0.4 }}
          >
            <div className="flex items-center gap-3 mb-3">
              <span
                className="text-xs font-bold uppercase tracking-wider"
                style={{ color: "var(--brand)" }}
              >
                {campaign.category}
              </span>
              <StatusBadge status={campaign.status} />
            </div>
            <h1
              className="text-2xl sm:text-3xl font-extrabold mb-4 leading-tight"
              style={{ color: "var(--fg)" }}
            >
              {campaign.title}
            </h1>
            <p
              className="text-base leading-relaxed"
              style={{ color: "var(--fg-muted)" }}
            >
              {campaign.description}
            </p>
          </motion.div>

          {/* Milestones */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
          >
            <h2
              className="text-lg font-bold mb-4"
              style={{ color: "var(--fg)" }}
            >
              Milestones
            </h2>
            {milestones.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--fg-muted)" }}>
                No milestones set yet.
              </p>
            ) : (
              <div className="space-y-3">
                {milestones.map((m, i) => (
                  <MilestoneRow
                    key={m.id}
                    milestone={m}
                    index={i}
                    expanded={expanded === m.id}
                    onToggle={() =>
                      setExpanded(expanded === m.id ? null : m.id)
                    }
                    isCreator={!!isCreator}
                    isBacker={!!myBacking}
                    walletAddress={walletAddress}
                    campaignId={id}
                    actionLoading={actionLoading}
                    onAction={handleMilestoneAction}
                  />
                ))}
              </div>
            )}
          </motion.div>

          {/* Backers */}
          {backers.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15, duration: 0.4 }}
            >
              <h2
                className="text-lg font-bold mb-4"
                style={{ color: "var(--fg)" }}
              >
                Backers ({backers.length})
              </h2>
              <div
                className="rounded-2xl overflow-hidden"
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                }}
              >
                {backers.slice(0, 8).map((b, i) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between px-5 py-3"
                    style={{
                      borderBottom:
                        i < Math.min(backers.length, 8) - 1
                          ? "1px solid var(--border)"
                          : "none",
                    }}
                  >
                    <span
                      className="text-sm"
                      style={{ color: "var(--fg-muted)" }}
                    >
                      Backer #{i + 1}
                    </span>
                    <span
                      className="text-sm font-semibold"
                      style={{ color: "var(--fg)" }}
                    >
                      {formatGEN(b.amount_wei)}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-5">
          {/* Funding card */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="rounded-2xl p-6 sticky top-24"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
            }}
          >
            <div className="mb-5">
              <div
                className="text-3xl font-extrabold"
                style={{ color: "var(--fg)" }}
              >
                {formatGEN(campaign.raised_wei)}
              </div>
              <div className="text-sm mt-0.5" style={{ color: "var(--fg-muted)" }}>
                raised of {formatGEN(campaign.goal_wei)} goal
              </div>
            </div>

            <ProgressBar value={progress} />

            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              {[
                { val: `${Math.round(progress)}%`, label: "funded" },
                { val: campaign.backer_count.toString(), label: "backers" },
                { val: remaining, label: "remaining" },
              ].map(({ val, label }) => (
                <div key={label}>
                  <div
                    className="text-lg font-bold"
                    style={{ color: "var(--fg)" }}
                  >
                    {val}
                  </div>
                  <div
                    className="text-xs"
                    style={{ color: "var(--fg-muted)" }}
                  >
                    {label}
                  </div>
                </div>
              ))}
            </div>

            {canBack && (
              <div className="mt-6 space-y-3">
                <div
                  className="flex items-center rounded-xl overflow-hidden"
                  style={{ border: "1px solid var(--border)" }}
                >
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="Amount in GEN"
                    value={backAmount}
                    onChange={(e) => setBackAmount(e.target.value)}
                    className="flex-1 px-4 py-3 bg-transparent outline-none text-sm"
                    style={{ color: "var(--fg)" }}
                  />
                  <span
                    className="px-3 text-xs font-semibold"
                    style={{ color: "var(--fg-muted)" }}
                  >
                    GEN
                  </span>
                </div>
                <button
                  onClick={handleBack}
                  disabled={backing}
                  className="w-full py-3 rounded-xl text-sm font-bold transition-all duration-200 hover:opacity-90 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ background: "var(--brand)", color: "#fff" }}
                >
                  {backing ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Backing...
                    </>
                  ) : (
                    "Back this campaign"
                  )}
                </button>
              </div>
            )}

            {!authenticated && campaign.status === "active" && (
              <p
                className="mt-4 text-xs text-center"
                style={{ color: "var(--fg-muted)" }}
              >
                Sign in to back this campaign.
              </p>
            )}

            {myBacking && (
              <div
                className="mt-4 px-4 py-3 rounded-xl text-sm text-center"
                style={{
                  background: "var(--brand-dim)",
                  color: "var(--brand)",
                }}
              >
                You backed{" "}
                <strong>{formatGEN(myBacking.amount_wei)}</strong>
              </div>
            )}

            {canRefund && (
              <button
                onClick={handleRefund}
                disabled={actionLoading === "refund"}
                className="mt-4 w-full py-3 rounded-xl text-sm font-bold border transition-all hover:bg-[var(--bg-secondary)] disabled:opacity-50 flex items-center justify-center gap-2"
                style={{
                  border: "1px solid #dc2626",
                  color: "#dc2626",
                }}
              >
                {actionLoading === "refund" ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  "Claim refund"
                )}
              </button>
            )}

            <div
              className="mt-5 pt-5 text-xs space-y-2"
              style={{
                borderTop: "1px solid var(--border)",
                color: "var(--fg-muted)",
              }}
            >
              <div className="flex items-center justify-between">
                <span>Deadline</span>
                <span>{new Date(campaign.deadline).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Milestones</span>
                <span>{milestones.length}</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function MilestoneRow({
  milestone,
  index,
  expanded,
  onToggle,
  isCreator,
  isBacker,
  walletAddress,
  campaignId,
  actionLoading,
  onAction,
}: {
  milestone: Milestone;
  index: number;
  expanded: boolean;
  onToggle: () => void;
  isCreator: boolean;
  isBacker: boolean;
  walletAddress?: string;
  campaignId: string;
  actionLoading: string | null;
  onAction: (
    mid: string,
    action: "verify" | "vote-approve" | "vote-reject" | "finalize",
    extra?: Record<string, unknown>
  ) => Promise<void>;
}) {
  const statusIcon = {
    pending: <AlertCircle size={16} style={{ color: "#a16207" }} />,
    submitted: <AlertCircle size={16} style={{ color: "#1d4ed8" }} />,
    approved: <CheckCircle size={16} style={{ color: "#15803d" }} />,
    rejected: <XCircle size={16} style={{ color: "#dc2626" }} />,
    voting: <Users size={16} style={{ color: "#c2410c" }} />,
    refunded: <CheckCircle size={16} style={{ color: "#64748b" }} />,
  }[milestone.status] ?? <AlertCircle size={16} />;

  const totalVotes =
    BigInt(milestone.votes_approve || "0") +
    BigInt(milestone.votes_reject || "0");
  const approveShare =
    totalVotes > 0n
      ? Number((BigInt(milestone.votes_approve || "0") * 100n) / totalVotes)
      : 0;

  const isLoading = (action: string) =>
    actionLoading === `${milestone.id}-${action}`;

  return (
    <div
      className="rounded-2xl overflow-hidden transition-all"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
      }}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-[var(--bg-secondary)]"
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-bold"
          style={{ background: "var(--brand-dim)", color: "var(--brand)" }}
        >
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="font-semibold text-sm truncate"
              style={{ color: "var(--fg)" }}
            >
              {milestone.title}
            </span>
            <StatusBadge status={milestone.status} />
          </div>
          <div className="text-xs mt-0.5" style={{ color: "var(--fg-muted)" }}>
            Due {new Date(milestone.due_date).toLocaleDateString()}
            {milestone.target_amount_wei !== "0" &&
              ` · ${formatGEN(milestone.target_amount_wei)}`}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {statusIcon}
          {expanded ? (
            <ChevronUp size={16} style={{ color: "var(--fg-muted)" }} />
          ) : (
            <ChevronDown size={16} style={{ color: "var(--fg-muted)" }} />
          )}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div
              className="px-5 pb-5 space-y-4"
              style={{ borderTop: "1px solid var(--border)" }}
            >
              <p
                className="text-sm leading-relaxed pt-4"
                style={{ color: "var(--fg-muted)" }}
              >
                {milestone.description}
              </p>

              {/* Evidence */}
              {milestone.evidence_url && (
                <div
                  className="rounded-xl p-4 space-y-2"
                  style={{ background: "var(--bg-secondary)" }}
                >
                  <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--brand)" }}>
                    Evidence submitted
                  </div>
                  <a
                    href={milestone.evidence_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sm hover:underline"
                    style={{ color: "var(--brand)" }}
                  >
                    <ExternalLink size={13} />
                    View evidence
                  </a>
                  {milestone.evidence_description && (
                    <p className="text-xs" style={{ color: "var(--fg-muted)" }}>
                      {milestone.evidence_description}
                    </p>
                  )}
                </div>
              )}

              {/* Voting */}
              {milestone.status === "voting" && totalVotes > 0n && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs" style={{ color: "var(--fg-muted)" }}>
                    <span>Approve ({approveShare}%)</span>
                    <span>Reject ({100 - approveShare}%)</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-secondary)" }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${approveShare}%`, background: "#15803d" }}
                    />
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-2 pt-1">
                {milestone.status === "submitted" && (
                  <ActionBtn
                    label="Trigger AI verification"
                    loading={isLoading("verify")}
                    onClick={() => onAction(milestone.id, "verify")}
                    primary
                  />
                )}

                {milestone.status === "voting" && isBacker && (
                  <>
                    <ActionBtn
                      label="Approve"
                      loading={isLoading("vote-approve")}
                      onClick={() => onAction(milestone.id, "vote-approve")}
                      primary
                    />
                    <ActionBtn
                      label="Reject"
                      loading={isLoading("vote-reject")}
                      onClick={() => onAction(milestone.id, "vote-reject")}
                      danger
                    />
                  </>
                )}

                {milestone.status === "voting" && isCreator && (
                  <ActionBtn
                    label="Finalize vote"
                    loading={isLoading("finalize")}
                    onClick={() => onAction(milestone.id, "finalize")}
                    primary
                  />
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ActionBtn({
  label,
  loading,
  onClick,
  primary,
  danger,
}: {
  label: string;
  loading: boolean;
  onClick: () => void;
  primary?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-80 disabled:opacity-50 active:scale-95"
      style={{
        background: danger
          ? "#fee2e2"
          : primary
          ? "var(--brand)"
          : "var(--bg-secondary)",
        color: danger ? "#dc2626" : primary ? "#fff" : "var(--fg)",
      }}
    >
      {loading && <Loader2 size={12} className="animate-spin" />}
      {label}
    </button>
  );
}

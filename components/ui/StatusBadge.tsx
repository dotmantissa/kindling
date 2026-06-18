import { CampaignStatus, MilestoneStatus } from "@/lib/schema";

type Status = CampaignStatus | MilestoneStatus;

const CONFIG: Record<
  Status,
  { label: string; bg: string; fg: string }
> = {
  active:    { label: "Active",     bg: "#dcfce7", fg: "#15803d" },
  funded:    { label: "Funded",     bg: "#dbeafe", fg: "#1d4ed8" },
  completed: { label: "Completed",  bg: "#f3e8ff", fg: "#7e22ce" },
  failed:    { label: "Failed",     bg: "#fee2e2", fg: "#dc2626" },
  cancelled: { label: "Cancelled",  bg: "#f1f5f9", fg: "#64748b" },
  pending:   { label: "Pending",    bg: "#fef9c3", fg: "#a16207" },
  submitted: { label: "Submitted",  bg: "#dbeafe", fg: "#1d4ed8" },
  approved:  { label: "Approved",   bg: "#dcfce7", fg: "#15803d" },
  rejected:  { label: "Rejected",   bg: "#fee2e2", fg: "#dc2626" },
  voting:    { label: "Voting",     bg: "#fde8d8", fg: "#c2410c" },
  refunded:  { label: "Refunded",   bg: "#f1f5f9", fg: "#64748b" },
};

export default function StatusBadge({ status }: { status: Status }) {
  const c = CONFIG[status] ?? { label: status, bg: "#f1f5f9", fg: "#64748b" };
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
      style={{ background: c.bg, color: c.fg }}
    >
      {c.label}
    </span>
  );
}

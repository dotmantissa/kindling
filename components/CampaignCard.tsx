"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Users, Clock, Target } from "lucide-react";
import { Campaign } from "@/lib/schema";
import { formatGEN, pct, timeLeft } from "@/lib/utils";
import ProgressBar from "./ui/ProgressBar";
import StatusBadge from "./ui/StatusBadge";

interface Props {
  campaign: Campaign;
  index?: number;
}

export default function CampaignCard({ campaign, index = 0 }: Props) {
  const progress = pct(campaign.raised_wei, campaign.goal_wei);
  const remaining = timeLeft(campaign.deadline);
  const hasImage = campaign.image_url && campaign.image_url.startsWith("http");

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.35 }}
    >
      <Link href={`/campaigns/${campaign.id}`} className="block group">
        <div
          className="rounded-2xl overflow-hidden transition-all duration-300 group-hover:shadow-xl group-hover:-translate-y-1"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
          }}
        >
          {/* Image / placeholder */}
          <div
            className="h-44 w-full overflow-hidden flex items-center justify-center"
            style={{ background: "var(--brand-dim)" }}
          >
            {hasImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={campaign.image_url}
                alt={campaign.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="flex flex-col items-center gap-2 opacity-40">
                <Target size={32} style={{ color: "var(--brand)" }} />
                <span className="text-xs font-medium" style={{ color: "var(--brand)" }}>
                  {campaign.category}
                </span>
              </div>
            )}
          </div>

          <div className="p-5">
            <div className="flex items-start justify-between gap-2 mb-3">
              <span
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: "var(--brand)" }}
              >
                {campaign.category}
              </span>
              <StatusBadge status={campaign.status} />
            </div>

            <h3
              className="font-bold text-base leading-snug mb-2 line-clamp-2 group-hover:text-[var(--brand)] transition-colors"
              style={{ color: "var(--fg)" }}
            >
              {campaign.title}
            </h3>

            <p
              className="text-sm line-clamp-2 mb-4"
              style={{ color: "var(--fg-muted)" }}
            >
              {campaign.description}
            </p>

            <ProgressBar value={progress} />

            <div className="mt-3 flex items-center justify-between text-xs" style={{ color: "var(--fg-muted)" }}>
              <span className="font-semibold" style={{ color: "var(--fg)" }}>
                {formatGEN(campaign.raised_wei)}
              </span>
              <span>{Math.round(progress)}% of {formatGEN(campaign.goal_wei)}</span>
            </div>

            <div
              className="mt-4 pt-4 flex items-center justify-between text-xs"
              style={{ borderTop: "1px solid var(--border)", color: "var(--fg-muted)" }}
            >
              <span className="flex items-center gap-1">
                <Users size={12} />
                {campaign.backer_count} {campaign.backer_count === 1 ? "backer" : "backers"}
              </span>
              <span className="flex items-center gap-1">
                <Clock size={12} />
                {remaining}
              </span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

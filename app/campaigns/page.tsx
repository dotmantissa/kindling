"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Search, SlidersHorizontal } from "lucide-react";
import { Campaign } from "@/lib/schema";
import CampaignCard from "@/components/CampaignCard";
import { CATEGORIES } from "@/lib/utils";

const STATUSES = ["All", "Active", "Funded", "Completed"] as const;

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [category, setCategory] = useState("All");

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (status !== "All") params.set("status", status.toLowerCase());
    if (category !== "All") params.set("category", category);

    fetch(`/api/campaigns?${params}`)
      .then((r) => r.json())
      .then((d) => setCampaigns(d.campaigns || []))
      .finally(() => setLoading(false));
  }, [status, category]);

  const filtered = campaigns.filter((c) =>
    search.trim()
      ? c.title.toLowerCase().includes(search.toLowerCase()) ||
        c.description.toLowerCase().includes(search.toLowerCase())
      : true
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-10"
      >
        <h1
          className="text-3xl sm:text-4xl font-extrabold mb-2"
          style={{ color: "var(--fg)" }}
        >
          All campaigns
        </h1>
        <p style={{ color: "var(--fg-muted)" }}>
          Real projects. Real milestones. Real accountability.
        </p>
      </motion.div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <div
          className="flex items-center gap-2 flex-1 px-4 py-2.5 rounded-xl"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
          }}
        >
          <Search size={16} style={{ color: "var(--fg-muted)" }} />
          <input
            type="text"
            placeholder="Search campaigns..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: "var(--fg)" }}
          />
        </div>

        <div className="flex items-center gap-2">
          <SlidersHorizontal size={16} style={{ color: "var(--fg-muted)" }} />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-3 py-2.5 rounded-xl text-sm font-medium outline-none cursor-pointer"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              color: "var(--fg)",
            }}
          >
            {STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="px-3 py-2.5 rounded-xl text-sm font-medium outline-none cursor-pointer"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              color: "var(--fg)",
            }}
          >
            <option value="All">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl h-80 animate-pulse"
              style={{ background: "var(--bg-secondary)" }}
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24">
          <p
            className="text-5xl mb-4 font-bold"
            style={{ color: "var(--fg-muted)", opacity: 0.3 }}
          >
            :(
          </p>
          <p
            className="text-lg font-semibold mb-2"
            style={{ color: "var(--fg)" }}
          >
            Nothing here yet
          </p>
          <p className="text-sm" style={{ color: "var(--fg-muted)" }}>
            {search
              ? "Try a different search, or clear your filters."
              : "Be the first to launch a campaign on Kindling."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((c, i) => (
            <CampaignCard key={c.id} campaign={c} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}

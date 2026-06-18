"use client";

import { motion } from "framer-motion";

interface Props {
  value: number; // 0–100
  height?: number;
  animated?: boolean;
}

export default function ProgressBar({ value, height = 6, animated = true }: Props) {
  return (
    <div
      className="w-full rounded-full overflow-hidden"
      style={{ height, background: "var(--bg-secondary)" }}
    >
      {animated ? (
        <motion.div
          className="h-full rounded-full"
          style={{ background: "var(--brand)" }}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, value)}%` }}
          transition={{ duration: 1, ease: [0.4, 0, 0.2, 1] }}
        />
      ) : (
        <div
          className="h-full rounded-full"
          style={{ width: `${Math.min(100, value)}%`, background: "var(--brand)" }}
        />
      )}
    </div>
  );
}

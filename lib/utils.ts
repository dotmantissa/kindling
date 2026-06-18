export function formatGEN(wei: string | bigint): string {
  const n = typeof wei === "string" ? BigInt(wei) : wei;
  const gen = Number(n) / 1e18;
  if (gen >= 1_000_000) return `${(gen / 1_000_000).toFixed(2)}M GEN`;
  if (gen >= 1_000) return `${(gen / 1_000).toFixed(1)}k GEN`;
  return `${gen.toLocaleString("en-US", { maximumFractionDigits: 4 })} GEN`;
}

export function genToWei(gen: number): string {
  return (BigInt(Math.round(gen * 1e9)) * BigInt(1e9)).toString();
}

export function weiToGen(wei: string): number {
  return Number(BigInt(wei)) / 1e18;
}

export function pct(raised: string, goal: string): number {
  if (goal === "0") return 0;
  return Math.min(100, (Number(BigInt(raised)) / Number(BigInt(goal))) * 100);
}

export function timeLeft(deadline: string): string {
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff <= 0) return "Ended";
  const days = Math.floor(diff / 86_400_000);
  if (days > 0) return `${days}d left`;
  const hours = Math.floor(diff / 3_600_000);
  return `${hours}h left`;
}

export function shortAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export const CATEGORIES = [
  "Tech",
  "Creative",
  "Games",
  "Hardware",
  "Film",
  "Music",
  "Publishing",
  "Food",
  "Fashion",
  "Community",
  "Other",
] as const;

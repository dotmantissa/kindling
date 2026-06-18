export type CampaignStatus =
  | "active"
  | "funded"
  | "completed"
  | "failed"
  | "cancelled";
export type MilestoneStatus =
  | "pending"
  | "submitted"
  | "approved"
  | "rejected"
  | "voting"
  | "verifying"
  | "refunded";

export interface Campaign {
  id: string;
  contract_id: string;
  creator_address: string;
  title: string;
  description: string;
  goal_wei: string;
  raised_wei: string;
  backer_count: number;
  deadline: string;
  image_url: string;
  category: string;
  status: CampaignStatus;
  created_at: string;
  milestone_count: number;
  tx_hash?: string;
}

export interface Milestone {
  id: string;
  campaign_id: string;
  contract_milestone_id: string;
  title: string;
  description: string;
  target_amount_wei: string;
  due_date: string;
  status: MilestoneStatus;
  evidence_url?: string;
  evidence_description?: string;
  submitted_at?: string;
  resolved_at?: string;
  votes_approve: string;
  votes_reject: string;
  order_index: number;
}

export interface Backer {
  id: string;
  campaign_id: string;
  backer_address: string;
  amount_wei: string;
  backed_at: string;
  tx_hash?: string;
  refunded: boolean;
}

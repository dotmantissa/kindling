# v0.2.16
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

import json
from dataclasses import dataclass
from genlayer import *


@allow_storage
@dataclass
class Campaign:
    id: str
    creator: Address
    title: str
    description: str
    goal: u256
    raised: u256
    backer_count: u256
    deadline: str
    image_url: str
    category: str
    status: str        # active | funded | completed | failed | cancelled
    created_at: str
    milestone_count: u256


@allow_storage
@dataclass
class Milestone:
    id: str
    campaign_id: str
    title: str
    description: str
    target_amount: u256
    due_date: str
    status: str        # pending | submitted | approved | rejected | voting
    evidence_url: str
    evidence_description: str
    submitted_at: str
    resolved_at: str
    votes_approve: u256
    votes_reject: u256


class KindlingCampaign(gl.Contract):
    campaigns: TreeMap[str, Campaign]
    milestones: TreeMap[str, Milestone]
    backer_amounts: TreeMap[str, u256]
    campaign_raised: TreeMap[str, u256]
    campaign_backer_count: TreeMap[str, u256]
    votes_cast: TreeMap[str, bool]
    campaign_count: u256

    def __init__(self):
        self.campaign_count = u256(0)

    # ─── helpers ──────────────────────────────────────────────────────────────

    def _milestone_key(self, campaign_id: str, milestone_id: str) -> str:
        return f"{campaign_id}_{milestone_id}"

    def _backer_key(self, campaign_id: str, addr: Address) -> str:
        return f"{campaign_id}_{addr.as_hex}"

    def _vote_key(self, campaign_id: str, milestone_id: str, addr: Address) -> str:
        return f"{campaign_id}_{milestone_id}_{addr.as_hex}"

    # ─── campaigns ────────────────────────────────────────────────────────────

    @gl.public.write
    def create_campaign(
        self,
        title: str,
        description: str,
        goal_wei: str,
        deadline: str,
        image_url: str,
        category: str,
        created_at: str,
    ) -> str:
        sender = gl.message.sender_address
        campaign_id = f"c{self.campaign_count}"
        self.campaign_count = u256(int(self.campaign_count) + 1)

        self.campaigns[campaign_id] = Campaign(
            id=campaign_id,
            creator=sender,
            title=title,
            description=description,
            goal=u256(int(goal_wei)),
            raised=u256(0),
            backer_count=u256(0),
            deadline=deadline,
            image_url=image_url,
            category=category,
            status="active",
            created_at=created_at,
            milestone_count=u256(0),
        )
        self.campaign_raised[campaign_id] = u256(0)
        self.campaign_backer_count[campaign_id] = u256(0)
        return campaign_id

    @gl.public.write
    def add_milestone(
        self,
        campaign_id: str,
        milestone_id: str,
        title: str,
        description: str,
        target_amount_wei: str,
        due_date: str,
    ) -> None:
        if campaign_id not in self.campaigns:
            raise gl.vm.UserError("Campaign not found")
        c = self.campaigns[campaign_id]
        if c.creator != gl.message.sender_address:
            raise gl.vm.UserError("Only the creator can add milestones")
        if c.status != "active":
            raise gl.vm.UserError("Campaign is no longer editable")

        key = self._milestone_key(campaign_id, milestone_id)
        self.milestones[key] = Milestone(
            id=milestone_id,
            campaign_id=campaign_id,
            title=title,
            description=description,
            target_amount=u256(int(target_amount_wei)),
            due_date=due_date,
            status="pending",
            evidence_url="",
            evidence_description="",
            submitted_at="",
            resolved_at="",
            votes_approve=u256(0),
            votes_reject=u256(0),
        )
        c.milestone_count = u256(int(c.milestone_count) + 1)

    @gl.public.write
    def back_campaign(
        self,
        campaign_id: str,
        amount_wei: str,
        timestamp: str,
    ) -> None:
        if campaign_id not in self.campaigns:
            raise gl.vm.UserError("Campaign not found")
        c = self.campaigns[campaign_id]
        if c.status not in ("active", "funded"):
            raise gl.vm.UserError("Campaign not accepting backing")

        amount = int(amount_wei)
        if amount <= 0:
            raise gl.vm.UserError("Amount must be positive")

        sender = gl.message.sender_address
        bk = self._backer_key(campaign_id, sender)

        if bk not in self.backer_amounts:
            self.backer_amounts[bk] = u256(0)
            c.backer_count = u256(int(c.backer_count) + 1)
            self.campaign_backer_count[campaign_id] = u256(
                int(self.campaign_backer_count[campaign_id]) + 1
            )

        self.backer_amounts[bk] = u256(int(self.backer_amounts[bk]) + amount)
        c.raised = u256(int(c.raised) + amount)
        self.campaign_raised[campaign_id] = u256(
            int(self.campaign_raised[campaign_id]) + amount
        )

        if int(c.raised) >= int(c.goal):
            c.status = "funded"

    # ─── milestone lifecycle ───────────────────────────────────────────────────

    @gl.public.write
    def submit_milestone(
        self,
        campaign_id: str,
        milestone_id: str,
        evidence_url: str,
        evidence_description: str,
        submitted_at: str,
    ) -> None:
        if campaign_id not in self.campaigns:
            raise gl.vm.UserError("Campaign not found")
        c = self.campaigns[campaign_id]
        if c.creator != gl.message.sender_address:
            raise gl.vm.UserError("Only the creator can submit milestones")

        key = self._milestone_key(campaign_id, milestone_id)
        if key not in self.milestones:
            raise gl.vm.UserError("Milestone not found")
        m = self.milestones[key]
        if m.status != "pending":
            raise gl.vm.UserError("Milestone is not pending")

        m.evidence_url = evidence_url
        m.evidence_description = evidence_description
        m.submitted_at = submitted_at
        m.status = "submitted"

    @gl.public.write
    def verify_milestone(
        self,
        campaign_id: str,
        milestone_id: str,
        resolved_at: str,
    ) -> None:
        if campaign_id not in self.campaigns:
            raise gl.vm.UserError("Campaign not found")
        c = self.campaigns[campaign_id]

        key = self._milestone_key(campaign_id, milestone_id)
        if key not in self.milestones:
            raise gl.vm.UserError("Milestone not found")
        m = self.milestones[key]
        if m.status != "submitted":
            raise gl.vm.UserError("Milestone not submitted yet")

        deliverable = m.description
        ev_url = m.evidence_url
        ev_desc = m.evidence_description
        campaign_title = c.title
        milestone_title = m.title

        def run_verification() -> str:
            fetched = ""
            if ev_url.startswith("http"):
                try:
                    r = gl.nondet.web.get(ev_url, headers={"User-Agent": "KindlingBot/1.0"})
                    if r.status == 200 and r.body:
                        fetched = r.body.decode("utf-8", errors="replace")[:3000]
                except Exception:
                    fetched = "(Could not fetch URL)"

            task = f"""You are a fair and impartial milestone verifier for a crowdfunding platform.

Campaign: {campaign_title}
Milestone: {milestone_title}
Required deliverable: {deliverable}

Evidence submitted by creator:
- URL: {ev_url}
- Creator description: {ev_desc}
- Fetched content preview: {fetched}

Has this milestone deliverable been genuinely completed based on the evidence?
Be strict — the evidence must clearly demonstrate the deliverable was done.

Answer with exactly one word: APPROVED or REJECTED"""

            result = gl.nondet.exec_prompt(task).strip().upper()
            if "APPROVED" in result:
                return "APPROVED"
            return "REJECTED"

        verdict = gl.eq_principle.prompt_comparative(
            run_verification,
            "Both results must agree: both APPROVED or both REJECTED.",
        )
        m.resolved_at = resolved_at

        if verdict == "APPROVED":
            m.status = "approved"
        else:
            m.status = "voting"

    # ─── backer voting ─────────────────────────────────────────────────────────

    @gl.public.write
    def cast_vote(
        self,
        campaign_id: str,
        milestone_id: str,
        approve: bool,
    ) -> None:
        if campaign_id not in self.campaigns:
            raise gl.vm.UserError("Campaign not found")

        key = self._milestone_key(campaign_id, milestone_id)
        if key not in self.milestones:
            raise gl.vm.UserError("Milestone not found")
        m = self.milestones[key]
        if m.status != "voting":
            raise gl.vm.UserError("Milestone is not in voting state")

        sender = gl.message.sender_address
        bk = self._backer_key(campaign_id, sender)
        if bk not in self.backer_amounts or int(self.backer_amounts[bk]) == 0:
            raise gl.vm.UserError("Only backers can vote")

        vote_key = self._vote_key(campaign_id, milestone_id, sender)
        if vote_key in self.votes_cast and self.votes_cast[vote_key]:
            raise gl.vm.UserError("Already voted")

        self.votes_cast[vote_key] = True
        stake = int(self.backer_amounts[bk])

        if approve:
            m.votes_approve = u256(int(m.votes_approve) + stake)
        else:
            m.votes_reject = u256(int(m.votes_reject) + stake)

    @gl.public.write
    def finalize_vote(
        self,
        campaign_id: str,
        milestone_id: str,
        resolved_at: str,
    ) -> None:
        if campaign_id not in self.campaigns:
            raise gl.vm.UserError("Campaign not found")
        c = self.campaigns[campaign_id]

        key = self._milestone_key(campaign_id, milestone_id)
        if key not in self.milestones:
            raise gl.vm.UserError("Milestone not found")
        m = self.milestones[key]
        if m.status != "voting":
            raise gl.vm.UserError("Milestone not in voting state")

        m.resolved_at = resolved_at

        if int(m.votes_approve) >= int(m.votes_reject):
            m.status = "approved"
        else:
            m.status = "rejected"
            c.status = "failed"

    # ─── refund / cancel ───────────────────────────────────────────────────────

    @gl.public.write
    def claim_refund(self, campaign_id: str, timestamp: str) -> str:
        if campaign_id not in self.campaigns:
            raise gl.vm.UserError("Campaign not found")
        c = self.campaigns[campaign_id]
        if c.status not in ("failed", "cancelled"):
            raise gl.vm.UserError("Campaign must be failed or cancelled")

        sender = gl.message.sender_address
        bk = self._backer_key(campaign_id, sender)
        if bk not in self.backer_amounts or int(self.backer_amounts[bk]) == 0:
            raise gl.vm.UserError("No backing to refund")

        amount = int(self.backer_amounts[bk])
        self.backer_amounts[bk] = u256(0)
        return str(amount)

    @gl.public.write
    def cancel_campaign(self, campaign_id: str) -> None:
        if campaign_id not in self.campaigns:
            raise gl.vm.UserError("Campaign not found")
        c = self.campaigns[campaign_id]
        if c.creator != gl.message.sender_address:
            raise gl.vm.UserError("Only the creator can cancel")
        if c.status != "active":
            raise gl.vm.UserError("Can only cancel active campaigns")
        c.status = "cancelled"

    # ─── views ─────────────────────────────────────────────────────────────────

    @gl.public.view
    def get_campaign(self, campaign_id: str) -> dict:
        if campaign_id not in self.campaigns:
            return {}
        c = self.campaigns[campaign_id]
        return {
            "id": c.id,
            "creator": c.creator.as_hex,
            "title": c.title,
            "description": c.description,
            "goal": str(int(c.goal)),
            "raised": str(int(c.raised)),
            "backer_count": str(int(c.backer_count)),
            "deadline": c.deadline,
            "image_url": c.image_url,
            "category": c.category,
            "status": c.status,
            "created_at": c.created_at,
            "milestone_count": str(int(c.milestone_count)),
        }

    @gl.public.view
    def get_all_campaigns(self) -> list:
        result = []
        for cid, c in self.campaigns.items():
            result.append({
                "id": c.id,
                "creator": c.creator.as_hex,
                "title": c.title,
                "description": c.description,
                "goal": str(int(c.goal)),
                "raised": str(int(c.raised)),
                "backer_count": str(int(c.backer_count)),
                "deadline": c.deadline,
                "image_url": c.image_url,
                "category": c.category,
                "status": c.status,
                "created_at": c.created_at,
                "milestone_count": str(int(c.milestone_count)),
            })
        return result

    @gl.public.view
    def get_milestone(self, campaign_id: str, milestone_id: str) -> dict:
        key = self._milestone_key(campaign_id, milestone_id)
        if key not in self.milestones:
            return {}
        m = self.milestones[key]
        return {
            "id": m.id,
            "title": m.title,
            "description": m.description,
            "target_amount": str(int(m.target_amount)),
            "due_date": m.due_date,
            "status": m.status,
            "evidence_url": m.evidence_url,
            "evidence_description": m.evidence_description,
            "submitted_at": m.submitted_at,
            "resolved_at": m.resolved_at,
            "votes_approve": str(int(m.votes_approve)),
            "votes_reject": str(int(m.votes_reject)),
        }

    @gl.public.view
    def get_campaign_count(self) -> str:
        return str(int(self.campaign_count))

    @gl.public.view
    def get_backer_amount(self, campaign_id: str, backer_address: str) -> str:
        addr = Address(backer_address)
        bk = self._backer_key(campaign_id, addr)
        if bk not in self.backer_amounts:
            return "0"
        return str(int(self.backer_amounts[bk]))

"""
Integration tests for KindlingCampaign contract.
Runs against a live GenLayer network (studionet or local).
"""
import time
import pytest
from gltest.assertions import tx_execution_succeeded, tx_execution_failed


def _read(fn, retries=3, delay=2):
    last_exc: Exception = RuntimeError("no attempts made")
    for attempt in range(retries):
        try:
            return fn()
        except Exception as exc:
            last_exc = exc
            if attempt < retries - 1:
                time.sleep(delay)
    raise last_exc


# ---------------------------------------------------------------------------
# Campaign creation
# ---------------------------------------------------------------------------

class TestCampaignCreation:
    def test_create_campaign(self, contract, deployer):
        c = contract.connect(account=deployer)
        receipt = c.create_campaign(args=[
            "Solar Charger",
            "A portable solar charger for hikers",
            "1000000",
            "2026-12-31",
            "https://example.com/solar.png",
            "hardware",
            "2026-06-20T00:00:00Z",
        ])
        assert tx_execution_succeeded(receipt)

        data = c.get_campaign(args=["c0"])
        assert data["title"] == "Solar Charger"
        assert data["description"] == "A portable solar charger for hikers"
        assert data["goal"] == "1000000"
        assert data["raised"] == "0"
        assert data["status"] == "active"
        assert data["category"] == "hardware"
        assert data["backer_count"] == "0"
        assert data["milestone_count"] == "0"
        assert data["creator"].lower() == deployer.address.lower()

    def test_campaign_count_increments(self, contract, deployer):
        c = contract.connect(account=deployer)
        count_before = c.get_campaign_count(args=[])

        receipt = c.create_campaign(args=[
            "Second Project",
            "Another project",
            "500000",
            "2026-12-31",
            "",
            "software",
            "2026-06-20T00:00:00Z",
        ])
        assert tx_execution_succeeded(receipt)

        count_after = c.get_campaign_count(args=[])
        assert int(count_after) == int(count_before) + 1

    def test_get_all_campaigns(self, contract, deployer):
        c = contract.connect(account=deployer)
        campaigns = c.get_all_campaigns(args=[])
        assert isinstance(campaigns, list)
        assert len(campaigns) >= 2


# ---------------------------------------------------------------------------
# Milestone management
# ---------------------------------------------------------------------------

class TestMilestones:
    def test_add_milestone(self, contract, deployer):
        c = contract.connect(account=deployer)
        receipt = c.add_milestone(args=[
            "c0", "m0",
            "Working Prototype",
            "Build a functional prototype of the solar charger",
            "500000",
            "2026-09-30",
        ])
        assert tx_execution_succeeded(receipt)

        m = c.get_milestone(args=["c0", "m0"])
        assert m["title"] == "Working Prototype"
        assert m["target_amount"] == "500000"
        assert m["status"] == "pending"
        assert m["evidence_url"] == ""

        campaign = c.get_campaign(args=["c0"])
        assert int(campaign["milestone_count"]) >= 1

    def test_add_second_milestone(self, contract, deployer):
        c = contract.connect(account=deployer)
        receipt = c.add_milestone(args=[
            "c0", "m1",
            "Ship Units",
            "Ship first batch to backers",
            "500000",
            "2026-11-30",
        ])
        assert tx_execution_succeeded(receipt)

        m = c.get_milestone(args=["c0", "m1"])
        assert m["title"] == "Ship Units"
        assert m["status"] == "pending"

    def test_only_creator_can_add_milestone(self, contract, outsider):
        c = contract.connect(account=outsider)
        receipt = c.add_milestone(args=[
            "c0", "m_bad",
            "Unauthorized Milestone",
            "Should fail",
            "100",
            "2026-12-01",
        ])
        assert tx_execution_failed(receipt)

    def test_milestone_on_nonexistent_campaign(self, contract, deployer):
        c = contract.connect(account=deployer)
        receipt = c.add_milestone(args=[
            "c999", "m0",
            "Ghost Milestone",
            "Should fail",
            "100",
            "2026-12-01",
        ])
        assert tx_execution_failed(receipt)


# ---------------------------------------------------------------------------
# Backing
# ---------------------------------------------------------------------------

class TestBacking:
    def test_back_campaign(self, contract, backer_a):
        c = contract.connect(account=backer_a)
        receipt = c.back_campaign(args=[
            "c0",
            "400000",
            "2026-06-20T01:00:00Z",
        ])
        assert tx_execution_succeeded(receipt)

        campaign = c.get_campaign(args=["c0"])
        assert int(campaign["raised"]) >= 400000
        assert int(campaign["backer_count"]) >= 1

        amount = c.get_backer_amount(args=["c0", backer_a.address])
        assert int(amount) >= 400000

    def test_second_backer(self, contract, backer_b):
        c = contract.connect(account=backer_b)
        receipt = c.back_campaign(args=[
            "c0",
            "300000",
            "2026-06-20T02:00:00Z",
        ])
        assert tx_execution_succeeded(receipt)

        campaign = c.get_campaign(args=["c0"])
        assert int(campaign["raised"]) >= 700000
        assert int(campaign["backer_count"]) >= 2

    def test_backing_triggers_funded_status(self, contract, backer_a):
        c = contract.connect(account=backer_a)
        receipt = c.back_campaign(args=[
            "c0",
            "600000",
            "2026-06-20T03:00:00Z",
        ])
        assert tx_execution_succeeded(receipt)

        campaign = _read(lambda: c.get_campaign(args=["c0"]))
        assert campaign["status"] == "funded"

    def test_zero_amount_rejected(self, contract, backer_a):
        c = contract.connect(account=backer_a)
        receipt = c.back_campaign(args=[
            "c0",
            "0",
            "2026-06-20T04:00:00Z",
        ])
        assert tx_execution_failed(receipt)

    def test_back_nonexistent_campaign(self, contract, backer_a):
        c = contract.connect(account=backer_a)
        receipt = c.back_campaign(args=[
            "c999",
            "100",
            "2026-06-20T04:00:00Z",
        ])
        assert tx_execution_failed(receipt)


# ---------------------------------------------------------------------------
# Milestone submission
# ---------------------------------------------------------------------------

class TestMilestoneSubmission:
    def test_submit_milestone(self, contract, deployer):
        c = contract.connect(account=deployer)
        receipt = c.submit_milestone(args=[
            "c0", "m0",
            "https://example.com/prototype-demo",
            "Video showing the working prototype",
            "2026-07-15T00:00:00Z",
        ])
        assert tx_execution_succeeded(receipt)

        m = c.get_milestone(args=["c0", "m0"])
        assert m["status"] == "submitted"
        assert m["evidence_url"] == "https://example.com/prototype-demo"

    def test_only_creator_can_submit(self, contract, outsider):
        c = contract.connect(account=outsider)
        receipt = c.submit_milestone(args=[
            "c0", "m1",
            "https://fake.com",
            "Unauthorized submission",
            "2026-07-15T00:00:00Z",
        ])
        assert tx_execution_failed(receipt)

    def test_cannot_submit_already_submitted(self, contract, deployer):
        c = contract.connect(account=deployer)
        receipt = c.submit_milestone(args=[
            "c0", "m0",
            "https://example.com/second-attempt",
            "Double submit",
            "2026-07-16T00:00:00Z",
        ])
        assert tx_execution_failed(receipt)


# ---------------------------------------------------------------------------
# Campaign cancellation and refund (uses a separate campaign)
# ---------------------------------------------------------------------------

class TestCancellationAndRefund:
    def test_cancel_flow(self, contract, deployer, backer_a):
        c_deployer = contract.connect(account=deployer)

        receipt = c_deployer.create_campaign(args=[
            "Cancelled Project",
            "This one will be cancelled",
            "1000000",
            "2026-12-31",
            "",
            "other",
            "2026-06-20T00:00:00Z",
        ])
        assert tx_execution_succeeded(receipt)

        campaigns = c_deployer.get_all_campaigns(args=[])
        cancel_id = campaigns[-1]["id"]

        c_backer = contract.connect(account=backer_a)
        receipt = c_backer.back_campaign(args=[
            cancel_id,
            "250000",
            "2026-06-20T05:00:00Z",
        ])
        assert tx_execution_succeeded(receipt)

        amount_before = c_backer.get_backer_amount(args=[cancel_id, backer_a.address])
        assert int(amount_before) == 250000

        receipt = c_deployer.cancel_campaign(args=[cancel_id])
        assert tx_execution_succeeded(receipt)

        campaign = c_deployer.get_campaign(args=[cancel_id])
        assert campaign["status"] == "cancelled"

        receipt = c_backer.claim_refund(args=[cancel_id, "2026-06-20T06:00:00Z"])
        assert tx_execution_succeeded(receipt)

        amount_after = c_backer.get_backer_amount(args=[cancel_id, backer_a.address])
        assert int(amount_after) == 0

    def test_only_creator_can_cancel(self, contract, deployer, outsider):
        c_deployer = contract.connect(account=deployer)
        receipt = c_deployer.create_campaign(args=[
            "Access Control Test",
            "Testing cancel permissions",
            "100",
            "2026-12-31",
            "",
            "other",
            "2026-06-20T00:00:00Z",
        ])
        assert tx_execution_succeeded(receipt)

        campaigns = c_deployer.get_all_campaigns(args=[])
        cid = campaigns[-1]["id"]

        c_outsider = contract.connect(account=outsider)
        receipt = c_outsider.cancel_campaign(args=[cid])
        assert tx_execution_failed(receipt)

    def test_cannot_cancel_funded_campaign(self, contract, deployer):
        c = contract.connect(account=deployer)
        receipt = c.cancel_campaign(args=["c0"])
        assert tx_execution_failed(receipt)

    def test_no_refund_on_active_campaign(self, contract, backer_a):
        c = contract.connect(account=backer_a)
        receipt = c.claim_refund(args=["c0", "2026-06-20T06:00:00Z"])
        assert tx_execution_failed(receipt)

    def test_non_backer_cannot_refund(self, contract, deployer, outsider):
        c_deployer = contract.connect(account=deployer)
        receipt = c_deployer.create_campaign(args=[
            "Refund Guard Test",
            "Testing refund access control",
            "100",
            "2026-12-31",
            "",
            "other",
            "2026-06-20T00:00:00Z",
        ])
        assert tx_execution_succeeded(receipt)

        campaigns = c_deployer.get_all_campaigns(args=[])
        cid = campaigns[-1]["id"]

        receipt = c_deployer.cancel_campaign(args=[cid])
        assert tx_execution_succeeded(receipt)

        c_outsider = contract.connect(account=outsider)
        receipt = c_outsider.claim_refund(args=[cid, "2026-06-20T07:00:00Z"])
        assert tx_execution_failed(receipt)


# ---------------------------------------------------------------------------
# Voting lifecycle (uses a separate campaign)
# ---------------------------------------------------------------------------

class TestVoting:
    vote_cid: str = ""

    @pytest.fixture(autouse=True, scope="class")
    def voting_campaign(self, contract, deployer, backer_a, backer_b):
        """Set up a campaign in voting state for vote tests."""
        c = contract.connect(account=deployer)

        receipt = c.create_campaign(args=[
            "Vote Test Campaign",
            "Campaign to test voting",
            "500000",
            "2026-12-31",
            "",
            "software",
            "2026-06-20T00:00:00Z",
        ])
        assert tx_execution_succeeded(receipt)

        campaigns = c.get_all_campaigns(args=[])
        self.__class__.vote_cid = campaigns[-1]["id"]
        cid = self.__class__.vote_cid

        receipt = c.add_milestone(args=[
            cid, "vm0",
            "Vote Milestone",
            "Milestone that goes to voting",
            "500000",
            "2026-10-01",
        ])
        assert tx_execution_succeeded(receipt)

        c_a = contract.connect(account=backer_a)
        receipt = c_a.back_campaign(args=[cid, "300000", "2026-06-20T10:00:00Z"])
        assert tx_execution_succeeded(receipt)

        c_b = contract.connect(account=backer_b)
        receipt = c_b.back_campaign(args=[cid, "200000", "2026-06-20T10:01:00Z"])
        assert tx_execution_succeeded(receipt)

        campaign = c.get_campaign(args=[cid])
        assert campaign["status"] == "funded"

        receipt = c.submit_milestone(args=[
            cid, "vm0",
            "https://example.com/vote-evidence",
            "Evidence for vote test",
            "2026-07-20T00:00:00Z",
        ])
        assert tx_execution_succeeded(receipt)

    def test_non_backer_cannot_vote(self, contract, outsider):
        cid = self.__class__.vote_cid
        c = contract.connect(account=outsider)

        m = c.get_milestone(args=[cid, "vm0"])
        if m["status"] != "voting":
            pytest.skip("Milestone not in voting state (AI may have approved it)")

        receipt = c.cast_vote(args=[cid, "vm0", True])
        assert tx_execution_failed(receipt)

    def test_cast_vote_approve(self, contract, backer_a):
        cid = self.__class__.vote_cid
        c = contract.connect(account=backer_a)

        m = c.get_milestone(args=[cid, "vm0"])
        if m["status"] != "voting":
            pytest.skip("Milestone not in voting state (AI may have approved it)")

        receipt = c.cast_vote(args=[cid, "vm0", True])
        assert tx_execution_succeeded(receipt)

        m = c.get_milestone(args=[cid, "vm0"])
        assert int(m["votes_approve"]) >= 300000

    def test_cannot_double_vote(self, contract, backer_a):
        cid = self.__class__.vote_cid
        c = contract.connect(account=backer_a)

        m = c.get_milestone(args=[cid, "vm0"])
        if m["status"] != "voting":
            pytest.skip("Milestone not in voting state")

        receipt = c.cast_vote(args=[cid, "vm0", True])
        assert tx_execution_failed(receipt)

    def test_cast_vote_reject_and_finalize(self, contract, deployer, backer_b):
        cid = self.__class__.vote_cid
        c = contract.connect(account=backer_b)

        m = c.get_milestone(args=[cid, "vm0"])
        if m["status"] != "voting":
            pytest.skip("Milestone not in voting state")

        receipt = c.cast_vote(args=[cid, "vm0", False])
        assert tx_execution_succeeded(receipt)

        c_deployer = contract.connect(account=deployer)
        receipt = c_deployer.finalize_vote(args=[
            cid, "vm0", "2026-08-01T00:00:00Z",
        ])
        assert tx_execution_succeeded(receipt)

        m = c_deployer.get_milestone(args=[cid, "vm0"])
        assert m["status"] in ("approved", "rejected")

    def test_vote_on_wrong_status(self, contract, backer_a):
        cid = self.__class__.vote_cid
        c = contract.connect(account=backer_a)

        m = c.get_milestone(args=[cid, "vm0"])
        if m["status"] == "voting":
            pytest.skip("Milestone still in voting state — previous vote tests must have skipped")

        receipt = c.cast_vote(args=[cid, "vm0", True])
        assert tx_execution_failed(receipt)


# ---------------------------------------------------------------------------
# AI verification (slow, requires LLM consensus)
# ---------------------------------------------------------------------------

@pytest.mark.slow
class TestAIVerification:
    def test_verify_milestone_runs(self, contract, deployer, backer_a):
        c = contract.connect(account=deployer)

        receipt = c.create_campaign(args=[
            "AI Verify Test",
            "Testing AI milestone verification",
            "100000",
            "2026-12-31",
            "",
            "software",
            "2026-06-20T00:00:00Z",
        ])
        assert tx_execution_succeeded(receipt)

        campaigns = c.get_all_campaigns(args=[])
        cid = campaigns[-1]["id"]

        receipt = c.add_milestone(args=[
            cid, "aim0",
            "Launch Website",
            "Launch a public website for the project",
            "100000",
            "2026-09-01",
        ])
        assert tx_execution_succeeded(receipt)

        c_backer = contract.connect(account=backer_a)
        receipt = c_backer.back_campaign(args=[cid, "100000", "2026-06-21T00:00:00Z"])
        assert tx_execution_succeeded(receipt)

        receipt = c.submit_milestone(args=[
            cid, "aim0",
            "https://example.com",
            "The project website is live at example.com",
            "2026-07-01T00:00:00Z",
        ])
        assert tx_execution_succeeded(receipt)

        receipt = c.verify_milestone(
            args=[cid, "aim0", "2026-07-02T00:00:00Z"],
            leader_only=True,
        )
        assert tx_execution_succeeded(receipt)

        m = c.get_milestone(args=[cid, "aim0"])
        assert m["status"] in ("approved", "voting")

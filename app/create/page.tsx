"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { usePrivy } from "@privy-io/react-auth";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Flame,
  Info,
  ImagePlus,
  X,
} from "lucide-react";
import { CATEGORIES, genToWei } from "@/lib/utils";

interface MilestoneForm {
  title: string;
  description: string;
  target_gen: string;
  due_date: string;
}

const STEPS = ["Basics", "Funding", "Milestones", "Review"];

export default function CreatePage() {
  const router = useRouter();
  const { authenticated, user, login } = usePrivy();

  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Tech");
  const [imageUrl, setImageUrl] = useState("");
  const [imageUploading, setImageUploading] = useState(false);
  const [goalGen, setGoalGen] = useState("");
  const [deadline, setDeadline] = useState("");
  const [milestones, setMilestones] = useState<MilestoneForm[]>([
    { title: "", description: "", target_gen: "", due_date: "" },
  ]);

  const walletAddress = user?.wallet?.address;

  const handleImageUpload = async (file: File) => {
    setImageUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const r = await fetch("/api/upload", { method: "POST", body: form });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setImageUrl(d.url);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Image upload failed");
    } finally {
      setImageUploading(false);
    }
  };

  if (!authenticated) {
    return (
      <div className="max-w-lg mx-auto px-4 py-24 text-center">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
          style={{ background: "var(--brand-dim)" }}
        >
          <Flame size={28} style={{ color: "var(--brand)" }} />
        </div>
        <h1
          className="text-2xl font-extrabold mb-3"
          style={{ color: "var(--fg)" }}
        >
          Start a campaign
        </h1>
        <p className="text-base mb-8" style={{ color: "var(--fg-muted)" }}>
          Sign in with your email to launch a campaign. It takes about 2 minutes.
        </p>
        <button
          onClick={() => login()}
          className="px-6 py-3 rounded-xl font-bold text-sm"
          style={{ background: "var(--brand)", color: "#fff" }}
        >
          Sign in
        </button>
      </div>
    );
  }

  const addMilestone = () =>
    setMilestones([
      ...milestones,
      { title: "", description: "", target_gen: "", due_date: "" },
    ]);

  const removeMilestone = (i: number) =>
    setMilestones(milestones.filter((_, idx) => idx !== i));

  const updateMilestone = (i: number, field: keyof MilestoneForm, val: string) => {
    const copy = [...milestones];
    copy[i] = { ...copy[i], [field]: val };
    setMilestones(copy);
  };

  const validate = () => {
    if (step === 0) {
      if (!title.trim()) return "Give your campaign a title";
      if (description.trim().length < 20)
        return "Write a proper description (at least 20 chars)";
    }
    if (step === 1) {
      if (!goalGen || parseFloat(goalGen) <= 0)
        return "Set a valid funding goal";
      if (!deadline) return "Set a deadline";
      if (new Date(deadline) < new Date())
        return "Deadline must be in the future";
    }
    if (step === 2) {
      for (let i = 0; i < milestones.length; i++) {
        const m = milestones[i];
        if (!m.title.trim()) return `Milestone ${i + 1} needs a title`;
        if (!m.description.trim())
          return `Milestone ${i + 1} needs a description`;
        if (!m.due_date) return `Milestone ${i + 1} needs a due date`;
      }
    }
    return null;
  };

  const next = () => {
    const err = validate();
    if (err) return toast.error(err);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const prev = () => setStep((s) => Math.max(s - 1, 0));

  const handleSubmit = async () => {
    const err = validate();
    if (err) return toast.error(err);
    if (!walletAddress) return;
    setSubmitting(true);
    try {
      const r = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          category,
          image_url: imageUrl,
          goal_wei: genToWei(parseFloat(goalGen)),
          deadline: new Date(deadline).toISOString(),
          creator_address: walletAddress,
          milestones: milestones.map((m, i) => ({
            title: m.title,
            description: m.description,
            target_amount_wei: m.target_gen ? genToWei(parseFloat(m.target_gen)) : "0",
            due_date: new Date(m.due_date).toISOString(),
            order_index: i,
          })),
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      toast.success("Campaign launched. Let it burn.");
      router.push(`/campaigns/${d.campaign.id}`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Launch failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
      {/* Step indicator */}
      <div className="flex items-center gap-0 mb-10">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center flex-1 last:flex-none">
            <button
              onClick={() => i < step && setStep(i)}
              className="flex items-center gap-2 shrink-0"
              disabled={i > step}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300"
                style={{
                  background:
                    i < step
                      ? "#dcfce7"
                      : i === step
                      ? "var(--brand)"
                      : "var(--bg-secondary)",
                  color:
                    i < step ? "#15803d" : i === step ? "#fff" : "var(--fg-muted)",
                }}
              >
                {i < step ? "✓" : i + 1}
              </div>
              <span
                className="text-xs font-semibold hidden sm:inline"
                style={{
                  color:
                    i === step ? "var(--fg)" : "var(--fg-muted)",
                }}
              >
                {s}
              </span>
            </button>
            {i < STEPS.length - 1 && (
              <div
                className="flex-1 h-px mx-3 transition-colors duration-300"
                style={{
                  background: i < step ? "var(--brand)" : "var(--border)",
                }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Form card */}
      <div
        className="rounded-2xl p-7"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
        }}
      >
        <AnimatePresence mode="wait">
          {step === 0 && (
            <StepWrap key="basics">
              <StepTitle>Tell us about it</StepTitle>
              <StepDesc>What are you building? Don't be shy, this is your pitch.</StepDesc>
              <Field label="Campaign title">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Something people will remember"
                  maxLength={80}
                  className="input-field"
                />
              </Field>
              <Field label="Description">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Explain what you're making, who it's for, and why it matters. The more honest, the better."
                  rows={5}
                  className="input-field resize-none"
                />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Category">
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="input-field cursor-pointer"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Cover image (optional)">
                  <label
                    className="flex flex-col items-center justify-center gap-2 w-full rounded-xl cursor-pointer transition-colors overflow-hidden"
                    style={{
                      border: "2px dashed var(--border)",
                      background: "var(--bg)",
                      minHeight: imageUrl ? "auto" : "80px",
                    }}
                  >
                    {imageUrl ? (
                      <div className="relative w-full">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={imageUrl}
                          alt="Cover"
                          className="w-full h-32 object-cover"
                        />
                        <button
                          type="button"
                          onClick={(e) => { e.preventDefault(); setImageUrl(""); }}
                          className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center"
                          style={{ background: "rgba(0,0,0,0.6)", color: "#fff" }}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1.5 py-4 px-3">
                        {imageUploading ? (
                          <Loader2 size={20} className="animate-spin" style={{ color: "var(--brand)" }} />
                        ) : (
                          <ImagePlus size={20} style={{ color: "var(--fg-muted)" }} />
                        )}
                        <span className="text-xs" style={{ color: "var(--fg-muted)" }}>
                          {imageUploading ? "Uploading..." : "Click to upload"}
                        </span>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="sr-only"
                      disabled={imageUploading}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(file);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </Field>
              </div>
            </StepWrap>
          )}

          {step === 1 && (
            <StepWrap key="funding">
              <StepTitle>How much do you need?</StepTitle>
              <StepDesc>
                Be honest. Backers respect realistic goals more than inflated ones.
              </StepDesc>
              <Field label="Funding goal (in GEN)">
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={goalGen}
                  onChange={(e) => setGoalGen(e.target.value)}
                  placeholder="e.g. 500"
                  className="input-field"
                />
              </Field>
              <Field label="Campaign deadline">
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="input-field"
                />
              </Field>
              <div
                className="flex items-start gap-3 p-4 rounded-xl mt-2"
                style={{ background: "var(--brand-dim)" }}
              >
                <Info size={16} className="shrink-0 mt-0.5" style={{ color: "var(--brand)" }} />
                <p className="text-xs leading-relaxed" style={{ color: "var(--brand)" }}>
                  Funds stay in escrow until milestones are verified. You'll earn them
                  progressively as your project moves forward.
                </p>
              </div>
            </StepWrap>
          )}

          {step === 2 && (
            <StepWrap key="milestones">
              <StepTitle>Break it into milestones</StepTitle>
              <StepDesc>
                Each milestone is a checkpoint you have to prove. Add as many as makes
                sense. The AI will verify each one.
              </StepDesc>
              <div className="space-y-5">
                {milestones.map((m, i) => (
                  <div
                    key={i}
                    className="rounded-xl p-5 space-y-4 relative"
                    style={{
                      background: "var(--bg-secondary)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className="text-xs font-bold uppercase tracking-wider"
                        style={{ color: "var(--brand)" }}
                      >
                        Milestone {i + 1}
                      </span>
                      {milestones.length > 1 && (
                        <button
                          onClick={() => removeMilestone(i)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-100 transition-colors"
                          style={{ color: "#dc2626" }}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                    <Field label="Milestone title">
                      <input
                        value={m.title}
                        onChange={(e) =>
                          updateMilestone(i, "title", e.target.value)
                        }
                        placeholder="e.g. Working prototype delivered"
                        className="input-field"
                      />
                    </Field>
                    <Field label="What counts as done?">
                      <textarea
                        value={m.description}
                        onChange={(e) =>
                          updateMilestone(i, "description", e.target.value)
                        }
                        placeholder="Be specific. The AI will use this to verify your evidence."
                        rows={3}
                        className="input-field resize-none"
                      />
                    </Field>
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Due date">
                        <input
                          type="date"
                          value={m.due_date}
                          onChange={(e) =>
                            updateMilestone(i, "due_date", e.target.value)
                          }
                          min={new Date().toISOString().split("T")[0]}
                          className="input-field"
                        />
                      </Field>
                      <Field label="Payout (GEN, optional)">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={m.target_gen}
                          onChange={(e) =>
                            updateMilestone(i, "target_gen", e.target.value)
                          }
                          placeholder="Leave blank to split equally"
                          className="input-field"
                        />
                      </Field>
                    </div>
                  </div>
                ))}
                <button
                  onClick={addMilestone}
                  className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:opacity-80 border-dashed"
                  style={{
                    border: "2px dashed var(--border)",
                    color: "var(--fg-muted)",
                  }}
                >
                  <Plus size={15} />
                  Add another milestone
                </button>
              </div>
            </StepWrap>
          )}

          {step === 3 && (
            <StepWrap key="review">
              <StepTitle>Ready to launch?</StepTitle>
              <StepDesc>
                Give it a final look. Once live, your backers are counting on this.
              </StepDesc>
              <div className="space-y-4">
                <ReviewRow label="Title" value={title} />
                <ReviewRow label="Category" value={category} />
                <ReviewRow label="Goal" value={`${goalGen} GEN`} />
                <ReviewRow
                  label="Deadline"
                  value={deadline ? new Date(deadline).toLocaleDateString() : ""}
                />
                <div
                  className="pt-4"
                  style={{ borderTop: "1px solid var(--border)" }}
                >
                  <p className="text-xs font-semibold mb-3" style={{ color: "var(--fg-muted)" }}>
                    {milestones.length} milestone{milestones.length !== 1 ? "s" : ""}
                  </p>
                  {milestones.map((m, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 py-2"
                      style={{ borderBottom: i < milestones.length - 1 ? "1px solid var(--border)" : "none" }}
                    >
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                        style={{ background: "var(--brand-dim)", color: "var(--brand)" }}
                      >
                        {i + 1}
                      </div>
                      <div>
                        <p className="text-sm font-semibold" style={{ color: "var(--fg)" }}>
                          {m.title}
                        </p>
                        <p className="text-xs" style={{ color: "var(--fg-muted)" }}>
                          Due {m.due_date ? new Date(m.due_date).toLocaleDateString() : "not set"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </StepWrap>
          )}
        </AnimatePresence>

        {/* Navigation */}
        <div
          className="flex items-center justify-between mt-8 pt-6"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <button
            onClick={prev}
            disabled={step === 0}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:bg-[var(--bg-secondary)] disabled:opacity-30"
            style={{ color: "var(--fg)" }}
          >
            <ChevronLeft size={16} />
            Back
          </button>

          {step < STEPS.length - 1 ? (
            <button
              onClick={next}
              className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-90 active:scale-95"
              style={{ background: "var(--brand)", color: "#fff" }}
            >
              Continue
              <ChevronRight size={16} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
              style={{ background: "var(--brand)", color: "#fff" }}
            >
              {submitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Launching...
                </>
              ) : (
                <>
                  <Flame size={14} />
                  Launch campaign
                </>
              )}
            </button>
          )}
        </div>
      </div>

      <style jsx>{`
        .input-field {
          width: 100%;
          padding: 10px 14px;
          border-radius: 12px;
          border: 1px solid var(--border);
          background: var(--bg);
          color: var(--fg);
          font-size: 14px;
          outline: none;
          transition: border-color 0.15s;
          font-family: inherit;
        }
        .input-field:focus {
          border-color: var(--brand);
        }
        .input-field::placeholder {
          color: var(--fg-muted);
        }
      `}</style>
    </div>
  );
}

function StepWrap({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.25 }}
      className="space-y-5"
    >
      {children}
    </motion.div>
  );
}

function StepTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xl font-extrabold" style={{ color: "var(--fg)" }}>
      {children}
    </h2>
  );
}

function StepDesc({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm" style={{ color: "var(--fg-muted)" }}>
      {children}
    </p>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold" style={{ color: "var(--fg-muted)" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2" style={{ borderBottom: "1px solid var(--border)" }}>
      <span className="text-xs" style={{ color: "var(--fg-muted)" }}>
        {label}
      </span>
      <span className="text-sm font-semibold" style={{ color: "var(--fg)" }}>
        {value}
      </span>
    </div>
  );
}

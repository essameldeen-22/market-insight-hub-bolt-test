import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useI18n } from "@/i18n/context";
import { submitSuggestion, loadMySuggestions } from "@/lib/suggestion.functions";
import { SAAS_CATEGORIES } from "@/lib/saas-alts";
import { Card } from "./Card";

interface MySuggestion {
  id: string;
  tool_name: string;
  category: string;
  alternative_name: string;
  estimated_savings_pct: number;
  difficulty: string;
  notes: string | null;
  status: string;
  created_at: string;
  reviewed_at: string | null;
}

export function SuggestionBox() {
  const { t } = useI18n();
  const submit = useServerFn(submitSuggestion);
  const loadMine = useServerFn(loadMySuggestions);

  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [mine, setMine] = useState<MySuggestion[]>([]);
  const [loadedMine, setLoadedMine] = useState(false);

  const [toolName, setToolName] = useState("");
  const [category, setCategory] = useState("Other");
  const [altName, setAltName] = useState("");
  const [savingsPct, setSavingsPct] = useState(50);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [notes, setNotes] = useState("");

  const handleSubmit = async () => {
    if (!toolName.trim() || !altName.trim()) return;
    setSubmitting(true);
    setMsg(null);
    try {
      await submit({
        tool_name: toolName.trim(),
        category,
        alternative_name: altName.trim(),
        estimated_savings_pct: savingsPct,
        difficulty,
        notes: notes.trim() || undefined,
      });
      setMsg(t("panels.saas.suggestion_submitted") || "Suggestion submitted for review!");
      setToolName(""); setAltName(""); setSavingsPct(50); setDifficulty("medium"); setNotes("");
      // Refresh my submissions
      const data = await loadMine();
      setMine(data as MySuggestion[]);
    } catch {
      setMsg(t("panels.saas.suggestion_error") || "Could not submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleOpen = async () => {
    const next = !open;
    setOpen(next);
    if (next && !loadedMine) {
      try {
        const data = await loadMine();
        setMine(data as MySuggestion[]);
      } catch { /* ignore */ }
      setLoadedMine(true);
    }
  };

  const statusColor = (status: string) =>
    status === "approved" ? "var(--success)" : status === "rejected" ? "var(--danger)" : "var(--text3)";

  return (
    <Card title={<><span className="icon-lead">💡</span> {t("panels.saas.suggestion_title") || "Suggest an Alternative"}</>}>
      {!open ? (
        <button className="btn btn-outline btn-sm" onClick={toggleOpen}>
          + {t("panels.saas.suggestion_open") || "Suggest a tool/alternative pair"}
        </button>
      ) : (
        <>
          <div style={{ display: "grid", gap: "0.6rem" }}>
            <div className="input-group">
              <label>{t("panels.saas.header_name")}</label>
              <input className="input-field" value={toolName} onChange={(e) => setToolName(e.target.value)} placeholder="e.g. Salesforce" />
            </div>
            <div className="input-group">
              <label>{t("panels.saas.header_cat")}</label>
              <select className="input-field" value={category} onChange={(e) => setCategory(e.target.value)}>
                {SAAS_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="input-group">
              <label>{t("panels.saas.suggestion_alt") || "Suggested alternative"}</label>
              <input className="input-field" value={altName} onChange={(e) => setAltName(e.target.value)} placeholder="e.g. SuiteCRM" />
            </div>
            <div style={{ display: "flex", gap: "1rem" }}>
              <div className="input-group" style={{ flex: 1 }}>
                <label>{t("panels.saas.suggestion_savings") || "Estimated savings %"}: <strong>{savingsPct}%</strong></label>
                <input type="range" min={0} max={100} value={savingsPct} onChange={(e) => setSavingsPct(Number(e.target.value))} />
              </div>
              <div className="input-group" style={{ flex: 1 }}>
                <label>{t("panels.saas.suggestion_difficulty") || "Difficulty"}</label>
                <select className="input-field" value={difficulty} onChange={(e) => setDifficulty(e.target.value as "easy" | "medium" | "hard")}>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
            </div>
            <div className="input-group">
              <label>{t("panels.saas.suggestion_notes") || "Notes (optional)"}</label>
              <textarea className="input-field" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Why is this a good alternative?" />
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button className="btn btn-outline btn-sm" onClick={handleSubmit} disabled={submitting || !toolName.trim() || !altName.trim()}>
                {submitting ? "..." : (t("common.save") || "Submit")}
              </button>
              <button className="btn btn-outline btn-sm" onClick={() => setOpen(false)}>{t("common.cancel") || "Cancel"}</button>
            </div>
            {msg && <div className="insight-box info" style={{ fontSize: "0.8rem" }}>{msg}</div>}
          </div>

          {loadedMine && mine.length > 0 && (
            <div style={{ marginTop: "1rem", borderTop: "1px solid var(--border)", paddingTop: "0.75rem" }}>
              <div style={{ fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.5rem" }}>
                {t("panels.saas.suggestion_mine") || "Your submissions"}
              </div>
              {mine.map((s) => (
                <div key={s.id} style={{ fontSize: "0.75rem", padding: "0.3rem 0", display: "flex", justifyContent: "space-between" }}>
                  <span>{s.tool_name} → {s.alternative_name}</span>
                  <span style={{ color: statusColor(s.status) }}>{s.status}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </Card>
  );
}

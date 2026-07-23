import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import { useI18n } from "@/i18n/context";
import { formatMoney, type Currency } from "@/lib/currency";
import { findAlternative, SAAS_CATEGORIES } from "@/lib/saas-alts";
import { loadSaasStack, saveSaasStack, type SaasTool } from "@/lib/persistence.functions";
import { useDebouncedEffect } from "@/lib/use-debounced-effect";
import { parseCsvToTools } from "@/lib/csv-parser";
import { exportElementToPdf } from "@/lib/pdf-export";
import { Card } from "./Card";
import { SuggestionBox } from "./SuggestionBox";

ChartJS.register(ArcElement, Tooltip, Legend);

export function SaasAudit({ currency, rates }: { currency: Currency; rates?: Record<string, number> }) {
  const { t } = useI18n();
  const load = useServerFn(loadSaasStack);
  const save = useServerFn(saveSaasStack);
  const [tools, setToolsState] = useState<SaasTool[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [history, setHistory] = useState<SaasTool[][]>([]);
  const [future, setFuture] = useState<SaasTool[][]>([]);

  const [teamSize, setTeamSize] = useState(5);
  const [complexity, setComplexity] = useState(3);
  const [risk, setRisk] = useState(3);

  useEffect(() => {
    load().then((rows) => {
      setToolsState(rows.length ? rows : [{ id: crypto.randomUUID(), name: "", category: "", cost: 0, users: 1, usage: 100 }]);
      setHydrated(true);
    }).catch(() => setHydrated(true));
  }, [load]);

  useDebouncedEffect(() => {
    if (!hydrated) return;
    save({ data: { tools } }).catch(() => {});
  }, [tools, hydrated]);

  const sameTools = (a: SaasTool[], b: SaasTool[]) => {
    if (a === b) return true;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      const x = a[i], y = b[i];
      if (x.id !== y.id || x.name !== y.name || x.category !== y.category ||
          x.cost !== y.cost || x.users !== y.users || x.usage !== y.usage) return false;
    }
    return true;
  };

  const applyTools = useCallback((next: SaasTool[] | ((prev: SaasTool[]) => SaasTool[])) => {
    setToolsState((prev) => {
      const resolved = typeof next === "function" ? (next as (p: SaasTool[]) => SaasTool[])(prev) : next;
      if (sameTools(prev, resolved)) return prev;
      setHistory((h) => {
        const capped = h.length >= 50 ? h.slice(1) : h;
        return [...capped, prev];
      });
      setFuture([]);
      return resolved;
    });
  }, []);

  const undo = useCallback(() => {
    setHistory((h) => {
      if (h.length === 0) return h;
      const prev = h[h.length - 1];
      setToolsState((cur) => {
        setFuture((f) => [...f, cur]);
        return prev;
      });
      return h.slice(0, -1);
    });
  }, []);
  const redo = useCallback(() => {
    setFuture((f) => {
      if (f.length === 0) return f;
      const next = f[f.length - 1];
      setToolsState((cur) => {
        setHistory((h) => [...h, cur]);
        return next;
      });
      return f.slice(0, -1);
    });
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const meta = e.ctrlKey || e.metaKey;
      if (!meta) return;
      if (e.key.toLowerCase() === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      else if ((e.key.toLowerCase() === "z" && e.shiftKey) || e.key.toLowerCase() === "y") { e.preventDefault(); redo(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo]);

  const update = (id: string, patch: Partial<SaasTool>) =>
    applyTools((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const remove = (id: string) => applyTools((prev) => prev.filter((x) => x.id !== id));
  const add = () => applyTools((prev) => [...prev, { id: crypto.randomUUID(), name: "", category: "", cost: 0, users: 1, usage: 100 }]);
  const clear = () => applyTools([]);
  const demo = () => applyTools([
    { id: "demo-salesforce", name: "Salesforce", category: "CRM", cost: 150, users: 10, usage: 60 },
    { id: "demo-slack", name: "Slack", category: "Communication", cost: 8, users: 25, usage: 95 },
    { id: "demo-figma", name: "Figma", category: "Design", cost: 15, users: 5, usage: 80 },
    { id: "demo-zoom", name: "Zoom", category: "Communication", cost: 20, users: 15, usage: 45 },
    { id: "demo-notion", name: "Notion", category: "Project Management", cost: 10, users: 20, usage: 70 },
    { id: "demo-mailchimp", name: "Mailchimp", category: "Marketing", cost: 50, users: 3, usage: 30 },
  ]);

  const onCsvFile = async (file: File) => {
    const text = await file.text();
    const imported = parseCsvToTools(text);
    if (imported.length === 0) return;
    applyTools((prev) => {
      const existingNames = new Set(prev.map((x) => x.name.toLowerCase()));
      const merged = [...prev.filter((x) => x.name || x.cost)];
      for (const tool of imported) {
        if (!existingNames.has(tool.name.toLowerCase())) merged.push(tool);
      }
      return merged;
    });
  };

  const stats = useMemo(() => {
    let annual = 0;
    let savings = 0;
    let waste = 0;
    let topCost = { name: "", value: 0 };
    let lowUse = { name: "", pct: 100 };
    let migratable = 0;
    for (const t of tools) {
      const monthly = (t.cost || 0) * (t.users || 1);
      const yearly = monthly * 12;
      annual += yearly;
      const alt = findAlternative(t.name);
      if (alt) {
        migratable += 1;
        savings += yearly * alt.save;
      }
      if (yearly > topCost.value) topCost = { name: t.name || "—", value: yearly };
      if ((t.usage ?? 100) < lowUse.pct && t.name) lowUse = { name: t.name, pct: t.usage ?? 0 };
      waste += yearly * (1 - (t.usage ?? 100) / 100);
    }
    return { annual, savings, waste, topCost, lowUse, migratable };
  }, [tools]);

  const migrationCost = useMemo(() => {
    if (stats.migratable === 0) return 0;
    const perToolHours = 8 * complexity;
    const hourlyRate = 40;
    const laborCost = stats.migratable * perToolHours * hourlyRate;
    const trainingCost = teamSize * 100 * complexity;
    const riskBuffer = laborCost * (risk / 10);
    return Math.round(laborCost + trainingCost + riskBuffer);
  }, [stats.migratable, teamSize, complexity, risk]);

  const netSavings = Math.max(0, stats.savings - migrationCost);

  const catData = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of tools) {
      if (!t.name) continue;
      const yearly = (t.cost || 0) * (t.users || 1) * 12;
      const cat = t.category || "Other";
      map.set(cat, (map.get(cat) ?? 0) + yearly);
    }
    return {
      labels: Array.from(map.keys()),
      datasets: [{
        data: Array.from(map.values()),
        backgroundColor: ["#6366f1", "#a855f7", "#f59e0b", "#22c55e", "#3b82f6", "#ef4444", "#06b6d4", "#84cc16", "#ec4899", "#8b5cf6"],
        borderWidth: 0,
      }],
    };
  }, [tools]);

  const migrations = useMemo(() => tools.filter((t) => t.name).map((t) => ({ tool: t, alt: findAlternative(t.name) })).filter((x) => x.alt), [tools]);

  const insights = useMemo(() => {
    const out: { kind: string; text: string }[] = [];
    if (stats.topCost.value > 0) out.push({ kind: "warn", text: t("panels.saas.insight_top_cost", { name: stats.topCost.name, money: formatMoney(stats.topCost.value, currency, rates) }) });
    if (stats.lowUse.name && stats.lowUse.pct < 50) out.push({ kind: "danger", text: t("panels.saas.insight_low_use", { name: stats.lowUse.name, pct: Math.round(stats.lowUse.pct) }) });
    if (stats.migratable > 0) out.push({ kind: "success", text: t("panels.saas.insight_ready", { n: stats.migratable, total: tools.filter((x) => x.name).length }) });
    if (stats.savings > 0 && stats.annual > 0) out.push({ kind: "info", text: t("panels.saas.insight_savings", { pct: Math.round((stats.savings / stats.annual) * 100), money: formatMoney(stats.savings, currency, rates) }) });
    if (stats.waste > 0) out.push({ kind: "warn", text: t("panels.saas.insight_waste", { money: formatMoney(stats.waste, currency, rates) }) });
    return out;
  }, [stats, tools, currency, t]);

  const canUndo = history.length > 0;
  const canRedo = future.length > 0;

  const reportRef = useRef<HTMLDivElement | null>(null);
  const [exporting, setExporting] = useState(false);
  const doExport = async () => {
    if (!reportRef.current) return;
    setExporting(true);
    try { await exportElementToPdf(reportRef.current, "saas-audit.pdf"); }
    finally { setExporting(false); }
  };

  return (
    <div ref={reportRef}>
      <div className="panel-header">
        <h2><span className="icon-lead">💼</span> {t("panels.saas.h2")}</h2>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button className="btn btn-outline btn-sm" onClick={undo} disabled={!canUndo} title="Ctrl+Z">↶ {t("panels.saas.undo")}</button>
          <button className="btn btn-outline btn-sm" onClick={redo} disabled={!canRedo} title="Ctrl+Y">↷ {t("panels.saas.redo")}</button>
          <label className="btn btn-outline btn-sm" style={{ cursor: "pointer" }}>
            📥 {t("panels.saas.csv_import")}
            <input type="file" accept=".csv,text/csv" style={{ display: "none" }} onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onCsvFile(f);
              e.target.value = "";
            }} />
          </label>
          <button className="btn btn-outline btn-sm" onClick={demo}>{t("panels.saas.demo")}</button>
          <button className="btn btn-outline btn-sm" onClick={clear}>{t("panels.saas.clear")}</button>
          <button className="btn btn-outline btn-sm" onClick={doExport} disabled={exporting || tools.length === 0}>📄 {exporting ? "…" : t("actions.export_pdf")}</button>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="left-col">
          <Card title={<><span className="icon-lead">🛠️</span> {t("panels.saas.tools_title")}</>}>
            <div style={{ fontSize: "0.72rem", color: "var(--text3)", marginBottom: "0.5rem" }}>{t("panels.saas.csv_hint")}</div>
            <div className="tool-row-grid header">
              <div>{t("panels.saas.header_name")}</div>
              <div>{t("panels.saas.header_cat")}</div>
              <div>{t("panels.saas.header_cost")}</div>
              <div>{t("panels.saas.header_users")}</div>
              <div>{t("panels.saas.header_usage")}</div>
              <div></div>
            </div>
            {tools.map((tool) => (
              <div key={tool.id} className="tool-row">
                <input value={tool.name} onChange={(e) => update(tool.id, { name: e.target.value })} placeholder="Slack" />
                <select value={tool.category} onChange={(e) => update(tool.id, { category: e.target.value })}>
                  <option value="">{t("panels.saas.pick_cat")}</option>
                  {SAAS_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
                <input type="number" min="0" value={tool.cost || ""} onChange={(e) => update(tool.id, { cost: Number(e.target.value) || 0 })} lang="en" />
                <input type="number" min="0" value={tool.users || ""} onChange={(e) => update(tool.id, { users: Number(e.target.value) || 0 })} lang="en" />
                <input type="number" min="0" max="100" value={tool.usage ?? 100} onChange={(e) => update(tool.id, { usage: Number(e.target.value) || 0 })} lang="en" />
                <button className="remove-btn" onClick={() => remove(tool.id)}>✕</button>
              </div>
            ))}
            <button className="add-btn" onClick={add}>+ {t("panels.saas.add_row")}</button>
          </Card>

          <Card title={<><span className="icon-lead">🔄</span> {t("panels.saas.migration_title")}</>}>
            {migrations.length === 0 ? (
              <div style={{ color: "var(--text3)", fontSize: "0.85rem", textAlign: "center", padding: "1rem" }}>{t("panels.saas.migration_empty")}</div>
            ) : (
              <>
                {migrations.map(({ tool, alt }) => {
                  if (!alt) return null;
                  const yearly = (tool.cost || 0) * (tool.users || 1) * 12;
                  const save = yearly * alt.save;
                  return (
                    <div key={tool.id} className="migration-item">
                      <div className="mi-icon">🔄</div>
                      <div className="info">
                        <div><span className="from">{tool.name}</span><span className="arrow"> → </span><span className="to">{alt.to}</span></div>
                        <div className="save">{t("panels.saas.save_per_year", { money: formatMoney(save, currency, rates) })}</div>
                      </div>
                      <span className={`mig-badge ${alt.difficulty}`}>{alt.difficulty}</span>
                    </div>
                  );
                })}
                <div className="insight-box info" style={{ marginTop: "1rem", fontSize: "0.75rem" }}>{t("panels.saas.savings_note")}</div>
              </>
            )}
          </Card>

          <Card title={<><span className="icon-lead">🧮</span> {t("panels.saas.migration_cost_title")}</>}>
            <div className="input-group">
              <label>{t("panels.saas.migration_team")}: <strong>{teamSize}</strong></label>
              <input type="range" min={1} max={50} value={teamSize} onChange={(e) => setTeamSize(Number(e.target.value))} />
            </div>
            <div className="input-group">
              <label>{t("panels.saas.migration_complexity")}: <strong>{complexity}</strong></label>
              <input type="range" min={1} max={5} value={complexity} onChange={(e) => setComplexity(Number(e.target.value))} />
            </div>
            <div className="input-group">
              <label>{t("panels.saas.migration_risk")}: <strong>{risk}</strong></label>
              <input type="range" min={1} max={5} value={risk} onChange={(e) => setRisk(Number(e.target.value))} />
            </div>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-label">{t("panels.saas.migration_cost_out")}</div>
                <div className="stat-value" style={{ color: "var(--danger)", fontSize: "1.05rem" }}>{formatMoney(migrationCost, currency, rates)}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">{t("panels.saas.net_savings")}</div>
                <div className="stat-value" style={{ color: netSavings > 0 ? "var(--success)" : "var(--text2)", fontSize: "1.05rem" }}>{formatMoney(netSavings, currency, rates)}</div>
              </div>
            </div>
          </Card>
        </div>

        <div className="right-col">
          <div className="summary-card">
            <div className="label">{t("panels.saas.total_annual")}</div>
            <div className="value">{formatMoney(stats.annual, currency, rates)}</div>
            {stats.savings > 0 && (
              <div className="savings">
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "0.7rem", opacity: 0.85 }}>{t("panels.saas.potential_savings")}</div>
                  <div className="amount">{formatMoney(stats.savings, currency, rates)}</div>
                </div>
              </div>
            )}
          </div>

          {catData.labels.length > 0 && (
            <Card title={<><span className="icon-lead">📊</span> {t("panels.saas.chart_title")}</>}>
              <div className="chart-container" style={{ height: 220 }}>
                <Doughnut data={catData} options={{ maintainAspectRatio: false, plugins: { legend: { position: "bottom", labels: { color: "#a1a1aa", font: { size: 10 } } } } }} />
              </div>
            </Card>
          )}

          {insights.length > 0 && (
            <Card title={<><span className="icon-lead">💡</span> {t("panels.saas.insights_title")}</>}>
              {insights.map((i, idx) => <div key={idx} className={`insight-box ${i.kind}`}>{i.text}</div>)}
            </Card>
          )}
        </div>
      </div>

      <div style={{ marginTop: "1rem" }}>
        <SuggestionBox />
      </div>
    </div>
  );
}

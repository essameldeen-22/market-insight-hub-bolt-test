import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useI18n } from "@/i18n/context";
import { formatMoney, type Currency } from "@/lib/currency";
import { loadPricingState, savePricingState, type PricingState } from "@/lib/persistence.functions";
import { useDebouncedEffect } from "@/lib/use-debounced-effect";
import { exportElementToPdf } from "@/lib/pdf-export";
import { Card } from "./Card";

export function PricingCalculator({ currency, rates }: { currency: Currency; rates?: Record<string, number> }) {
  const { t } = useI18n();
  const load = useServerFn(loadPricingState);
  const save = useServerFn(savePricingState);
  const [state, setState] = useState<PricingState>({ cost: 0, customers: 0, competitor: 0, margin: 30, model: "subscription" });
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    load().then((s) => { if (s && Object.keys(s).length) setState((prev) => ({ ...prev, ...s })); setHydrated(true); }).catch(() => setHydrated(true));
  }, [load]);
  useDebouncedEffect(() => { if (hydrated) save({ data: { state } }).catch(() => {}); }, [state, hydrated]);

  const optimal = useMemo(() => {
    if (state.customers === 0) return 0;
    const raw = (state.cost / state.customers) * (1 + state.margin / 100);
    return Math.round(raw / 5) * 5;
  }, [state]);
  const revenue = optimal * state.customers;
  const profit = revenue - state.cost;
  const annual = revenue * 12;
  const breakEven = optimal > 0 ? Math.ceil(state.cost / optimal) : 0;
  const diff = state.competitor > 0 ? ((optimal - state.competitor) / state.competitor) * 100 : 0;

  const modelLabel = state.model === "subscription" ? t("panels.pricing.model_lbl_sub") : state.model === "onetime" ? t("panels.pricing.model_lbl_one") : t("panels.pricing.model_lbl_free");

  const insights: { kind: string; text: string }[] = [];
  if (state.competitor > 0) {
    if (diff < -10) insights.push({ kind: "success", text: t("panels.pricing.ins_lower") });
    else if (diff > 20) insights.push({ kind: "warn", text: t("panels.pricing.ins_higher") });
    else insights.push({ kind: "info", text: t("panels.pricing.ins_mid") });
  }
  if (state.margin < 20) insights.push({ kind: "warn", text: t("panels.pricing.ins_lowmargin") });
  if (breakEven > state.customers) insights.push({ kind: "danger", text: t("panels.pricing.ins_high_be") });

  const reportRef = useRef<HTMLDivElement | null>(null);
  const [exporting, setExporting] = useState(false);
  const doExport = async () => {
    if (!reportRef.current) return;
    setExporting(true);
    try { await exportElementToPdf(reportRef.current, "pricing-calculator.pdf"); }
    finally { setExporting(false); }
  };

  return (
    <div ref={reportRef}>
      <div className="panel-header">
        <h2><span className="icon-lead">💰</span> {t("panels.pricing.h2")}</h2>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button className="btn btn-outline btn-sm" onClick={() => setState({ cost: 0, customers: 0, competitor: 0, margin: 30, model: "subscription" })}>{t("panels.pricing.reset")}</button>
          <button className="btn btn-outline btn-sm" onClick={doExport} disabled={exporting}>📄 {exporting ? "…" : t("actions.export_pdf")}</button>
        </div>
      </div>
      <div className="dashboard-grid">
        <div className="left-col">
          <Card title={<><span className="icon-lead">⚙️</span> {t("panels.pricing.criteria_title")}</>}>
            {[
              { key: "cost", label: t("panels.pricing.cost") },
              { key: "customers", label: t("panels.pricing.customers") },
              { key: "competitor", label: t("panels.pricing.competitor") },
              { key: "margin", label: t("panels.pricing.margin") },
            ].map((f) => (
              <div key={f.key} className="input-group">
                <label>{f.label}</label>
                <input className="input-field" type="number" min="0" lang="en" value={(state as never)[f.key] || ""} onChange={(e) => setState((s) => ({ ...s, [f.key]: Number(e.target.value) || 0 }))} />
              </div>
            ))}
            <div className="input-group">
              <label>{t("panels.pricing.model")}</label>
              <select className="input-field" value={state.model} onChange={(e) => setState((s) => ({ ...s, model: e.target.value as PricingState["model"] }))}>
                <option value="subscription">{t("panels.pricing.model_sub")}</option>
                <option value="onetime">{t("panels.pricing.model_one")}</option>
                <option value="freemium">{t("panels.pricing.model_free")}</option>
              </select>
            </div>
          </Card>

          {insights.length > 0 && (
            <Card title={<><span className="icon-lead">💡</span> {t("panels.pricing.recs_title")}</>}>
              {insights.map((i, idx) => <div key={idx} className={`insight-box ${i.kind}`}>{i.text}</div>)}
            </Card>
          )}
        </div>

        <div className="right-col">
          <div className="price-calc-result">
            <div className="label">{t("panels.pricing.optimal")}</div>
            <div className="big">{formatMoney(optimal, currency, rates)}</div>
            <div style={{ fontSize: "0.85rem", opacity: 0.85 }}>{modelLabel}</div>
          </div>

          {state.competitor > 0 && (
            <Card title={<><span className="icon-lead">⚖️</span> {t("panels.pricing.compare_title")}</>}>
              <div className="stats-grid">
                <div className="stat-card"><div className="stat-label">{t("panels.pricing.your_price")}</div><div className="stat-value" style={{ color: "var(--accent)" }}>{formatMoney(optimal, currency, rates)}</div></div>
                <div className="stat-card"><div className="stat-label">{t("panels.pricing.comp_price")}</div><div className="stat-value">{formatMoney(state.competitor, currency, rates)}</div></div>
                <div className="stat-card"><div className="stat-label">{t("panels.pricing.diff")}</div><div className={`stat-value ${diff < 0 ? "positive" : "negative"}`}>{diff > 0 ? "+" : ""}{diff.toFixed(1)}%</div></div>
              </div>
            </Card>
          )}

          <Card title={<><span className="icon-lead">📈</span> {t("panels.pricing.projections_title")}</>}>
            <div className="stats-grid">
              <div className="stat-card"><div className="stat-label">{t("panels.pricing.revenue")}</div><div className="stat-value" style={{ fontSize: "1.15rem" }}>{formatMoney(revenue, currency, rates)}</div></div>
              <div className="stat-card"><div className="stat-label">{t("panels.pricing.profit")}</div><div className={`stat-value ${profit >= 0 ? "positive" : "negative"}`} style={{ fontSize: "1.15rem" }}>{formatMoney(profit, currency, rates)}</div></div>
              <div className="stat-card"><div className="stat-label">{t("panels.pricing.annual")}</div><div className="stat-value" style={{ fontSize: "1.15rem" }}>{formatMoney(annual, currency, rates)}</div></div>
              <div className="stat-card"><div className="stat-label">{t("panels.pricing.break_even")}</div><div className="stat-value warning" style={{ fontSize: "1.15rem" }}>{breakEven}</div></div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

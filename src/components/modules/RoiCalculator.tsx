import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Filler, Title } from "chart.js";
import { Line } from "react-chartjs-2";
import { useI18n } from "@/i18n/context";
import { formatMoney, type Currency } from "@/lib/currency";
import { loadRoiState, saveRoiState, type RoiState } from "@/lib/persistence.functions";
import { useDebouncedEffect } from "@/lib/use-debounced-effect";
import { exportElementToPdf } from "@/lib/pdf-export";
import { Card } from "./Card";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Title);

export function RoiCalculator({ currency, rates }: { currency: Currency; rates?: Record<string, number> }) {
  const { t } = useI18n();
  const load = useServerFn(loadRoiState);
  const save = useServerFn(saveRoiState);
  const [state, setState] = useState<RoiState>({ initial: 0, monthly: 0, savings: 0, revenue: 0, period: 12 });
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    load().then((s) => { if (s && Object.keys(s).length) setState((prev) => ({ ...prev, ...s })); setHydrated(true); }).catch(() => setHydrated(true));
  }, [load]);
  useDebouncedEffect(() => { if (hydrated) save({ data: { state } }).catch(() => {}); }, [state, hydrated]);

  const totalCost = state.initial + state.monthly * state.period;
  const totalGain = (state.savings + state.revenue) * state.period;
  const net = totalGain - totalCost;
  const roiPct = totalCost > 0 ? (net / totalCost) * 100 : 0;
  const monthlyNet = state.savings + state.revenue - state.monthly;
  const beMonth = monthlyNet > 0 ? Math.ceil(state.initial / monthlyNet) : 0;
  const beReached = beMonth > 0 && beMonth <= state.period;

  const chartData = useMemo(() => {
    const labels: string[] = [];
    const cost: number[] = [];
    const gain: number[] = [];
    for (let m = 1; m <= state.period; m++) {
      labels.push(`${t("panels.roi.month")} ${m}`);
      cost.push(state.initial + state.monthly * m);
      gain.push((state.savings + state.revenue) * m);
    }
    return {
      labels,
      datasets: [
        { label: t("panels.roi.chart_cost"), data: cost, borderColor: "#ef4444", backgroundColor: "rgba(239,68,68,0.1)", fill: true, tension: 0.35 },
        { label: t("panels.roi.chart_gain"), data: gain, borderColor: "#22c55e", backgroundColor: "rgba(34,197,94,0.15)", fill: true, tension: 0.35 },
      ],
    };
  }, [state, t]);

  const insights: { kind: string; text: string }[] = [];
  if (beReached) insights.push({ kind: "success", text: t("panels.roi.be_month", { n: beMonth }) });
  else if (state.initial > 0) insights.push({ kind: "warn", text: t("panels.roi.be_none") });
  if (monthlyNet !== 0) insights.push({ kind: "info", text: t("panels.roi.net_monthly", { money: formatMoney(monthlyNet, currency, rates) }) });
  if (net !== 0) insights.push({ kind: net > 0 ? "success" : "danger", text: t("panels.roi.net_period", { p: state.period, money: formatMoney(net, currency, rates) }) });

  const reportRef = useRef<HTMLDivElement | null>(null);
  const [exporting, setExporting] = useState(false);
  const doExport = async () => {
    if (!reportRef.current) return;
    setExporting(true);
    try { await exportElementToPdf(reportRef.current, "roi-calculator.pdf"); }
    finally { setExporting(false); }
  };

  return (
    <div ref={reportRef}>
      <div className="panel-header">
        <h2><span className="icon-lead">📊</span> {t("panels.roi.h2")}</h2>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button className="btn btn-outline btn-sm" onClick={() => setState({ initial: 0, monthly: 0, savings: 0, revenue: 0, period: 12 })}>{t("panels.roi.reset")}</button>
          <button className="btn btn-outline btn-sm" onClick={doExport} disabled={exporting}>📄 {exporting ? "…" : t("actions.export_pdf")}</button>
        </div>
      </div>
      <div className="dashboard-grid">
        <div className="left-col">
          <Card title={<><span className="icon-lead">💵</span> {t("panels.roi.costs_title")}</>}>
            {[
              { key: "initial", label: t("panels.roi.initial") },
              { key: "monthly", label: t("panels.roi.monthly") },
              { key: "savings", label: t("panels.roi.savings") },
              { key: "revenue", label: t("panels.roi.revenue") },
              { key: "period", label: t("panels.roi.period") },
            ].map((f) => (
              <div key={f.key} className="input-group">
                <label>{f.label}</label>
                <input className="input-field" type="number" min="0" lang="en" value={(state as never)[f.key] || ""} onChange={(e) => setState((s) => ({ ...s, [f.key]: Number(e.target.value) || 0 }))} />
              </div>
            ))}
          </Card>

          {insights.length > 0 && (
            <Card title={<><span className="icon-lead">💡</span> {t("panels.roi.break_even_title")}</>}>
              {insights.map((i, idx) => <div key={idx} className={`insight-box ${i.kind}`}>{i.text}</div>)}
            </Card>
          )}
        </div>
        <div className="right-col">
          <Card title={<><span className="icon-lead">📊</span> {t("panels.roi.results_title")}</>}>
            <div className="roi-grid">
              <div className="roi-result"><div className="num" style={{ color: "var(--danger)" }}>{formatMoney(totalCost, currency, rates)}</div><div className="lbl">{t("panels.roi.total_cost")}</div></div>
              <div className="roi-result"><div className="num" style={{ color: "var(--success)" }}>{formatMoney(totalGain, currency, rates)}</div><div className="lbl">{t("panels.roi.total_gain")}</div></div>
              <div className="roi-result"><div className="num" style={{ color: net >= 0 ? "var(--success)" : "var(--danger)" }}>{formatMoney(net, currency, rates)}</div><div className="lbl">{t("panels.roi.net")}</div></div>
              <div className="roi-result"><div className="num">{roiPct.toFixed(1)}%</div><div className="lbl">{t("panels.roi.percent")}</div></div>
            </div>
          </Card>
          {state.period > 0 && (
            <Card>
              <div style={{ height: 240 }}>
                <Line data={chartData} options={{ maintainAspectRatio: false, plugins: { legend: { labels: { color: "#a1a1aa", font: { size: 11 } } } }, scales: { x: { ticks: { color: "#71717a", font: { size: 10 } }, grid: { color: "rgba(255,255,255,0.05)" } }, y: { ticks: { color: "#71717a", font: { size: 10 } }, grid: { color: "rgba(255,255,255,0.05)" } } } }} />
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Filler, Title } from "chart.js";
import { Line } from "react-chartjs-2";
import { useI18n } from "@/i18n/context";
import { analyzeReviewsFn } from "@/lib/claude.functions";
import { loadAnalysisHistory, type AnalysisSummary } from "@/lib/trend.functions";
import type { AnalysisResult } from "@/lib/claude.server";
import { exportElementToPdf } from "@/lib/pdf-export";
import { Card } from "./Card";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Title);

interface Competitor {
  id: string;
  name: string;
  reviews: string;
  result?: AnalysisResult;
  loading?: boolean;
  error?: string;
}

const COMPETITOR_DEMOS: Record<"ar" | "en", { name: string; reviews: string[] }[]> = {
  ar: [
    {
      name: "سماعات بلوتوث XYZ",
      reviews: [
        "الصوت رائع جداً لكن البطارية ضعيفة بعد 3 شهور استخدام",
        "مريحة في الاستخدام لفترات طويلة، الجودة ممتازة",
        "الاتصال بينقطع كتير مع الموبايل، مشكلة كبيرة",
        "التصميم أنيق والصوت واضح جداً، أنصح بها",
        "السعر مرتفع مقابل جودة البناء البلاستيكية",
        "البطارية بتفضل شغالة يوم كامل بشحنة واحدة",
        "المقاس مناسب والعزل الصوتي ممتاز في الشارع",
        "خاصية إلغاء الضوضاء ضعيفة مقارنة بالسعر",
        "التوصيل سريع والتغليف احترافي جداً",
        "جودة الميكروفون في المكالمات متوسطة",
      ],
    },
    {
      name: "ساعة ذكية ABC",
      reviews: [
        "الشاشة واضحة تحت الشمس بشكل ممتاز",
        "التطبيق بطيء ومليان bugs، محتاج تحديث",
        "دقة قياس النبض ممتازة أثناء الجري",
        "بتفصل عن الموبايل كل شوية",
        "التصميم أنيق ومناسب للاستخدام اليومي",
        "البطارية بتكفي 5 أيام فعلاً",
        "السعر أعلى من المنافسين بدون مبرر",
        "خاصية GPS دقيقة جداً",
      ],
    },
    {
      name: "لابتوب DEF Pro",
      reviews: [
        "الأداء ممتاز في تشغيل البرامج الثقيلة",
        "بيسخن جداً بعد ساعة استخدام",
        "لوحة المفاتيح مريحة والإضاءة رائعة",
        "المروحة صوتها عالي في الألعاب",
        "الشاشة ألوانها دقيقة ومناسبة للتصميم",
        "الوزن ثقيل جداً للحمل اليومي",
      ],
    },
  ],
  en: [
    {
      name: "XYZ Bluetooth Headphones",
      reviews: [
        "Battery lasts a full day on a single charge, love it",
        "Bluetooth keeps disconnecting when I move around",
        "Design is sleek and the fit is comfortable",
        "Sound quality is excellent for the price",
        "Build quality feels cheap for the price tag",
        "Noise cancellation is weaker than advertised",
        "Very comfortable for long listening sessions",
        "Microphone quality on calls is just average",
        "Fast shipping and premium packaging",
        "Price is too high for plastic build quality",
      ],
    },
    {
      name: "ABC Smart Watch",
      reviews: [
        "Screen is perfectly readable in sunlight",
        "Companion app is slow and full of bugs",
        "Heart-rate tracking is very accurate while running",
        "Disconnects from my phone constantly",
        "Sleek design, works well for daily wear",
        "Battery genuinely lasts 5 days",
        "Priced higher than competitors without clear reason",
        "GPS is spot on",
      ],
    },
    {
      name: "DEF Pro Laptop",
      reviews: [
        "Handles heavy workloads without a stutter",
        "Runs very hot after about an hour of use",
        "Keyboard is comfortable and backlighting is great",
        "Fan noise is loud under gaming load",
        "Colors on the display are accurate, great for design",
        "Too heavy to carry around every day",
      ],
    },
  ],
};

function SentimentStats({ result }: { result: AnalysisResult }) {
  const { t } = useI18n();
  const total = result.totalReviews || 1;
  const s = result.sentiment;
  const rows: [string, number, string][] = [
    [t("panels.competitor.stat_total"), result.totalReviews, "var(--text)"],
    [t("panels.competitor.stat_pos"), s.positive, "var(--success)"],
    [t("panels.competitor.stat_neg"), s.negative, "var(--danger)"],
    [t("panels.competitor.stat_mix"), s.mixed, "var(--warning)"],
    [t("panels.competitor.stat_neu"), s.neutral, "var(--text2)"],
  ];
  return (
    <>
      <div className="stats-grid">
        {rows.map(([label, val, color]) => (
          <div key={label} className="stat-card">
            <div className="stat-label">{label}</div>
            <div className="stat-value" style={{ color }}>{val}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: "0.75rem", color: "var(--text3)", marginBottom: "0.4rem" }}>{t("panels.competitor.dist_label")}</div>
      <div className="sentiment-bar">
        {(["positive", "negative", "mixed", "neutral"] as const).map((k) => {
          const pct = (s[k] / total) * 100;
          if (pct < 1) return null;
          const bg = k === "positive" ? "var(--success)" : k === "negative" ? "var(--danger)" : k === "mixed" ? "var(--warning)" : "var(--text3)";
          return <div key={k} className="sentiment-segment" style={{ width: `${pct}%`, background: bg }}>{Math.round(pct)}%</div>;
        })}
      </div>
    </>
  );
}

function TopicsList({ topics }: { topics: AnalysisResult["topics"] }) {
  const { t } = useI18n();
  const max = Math.max(1, ...topics.map((x) => x.count));
  const leanText: Record<string, string> = {
    strength: t("panels.competitor.lean_strength"),
    pain: t("panels.competitor.lean_pain"),
    split: t("panels.competitor.lean_split"),
    neutral: t("panels.competitor.lean_neutral"),
  };
  return (
    <>
      {topics.map((topic, i) => (
        <div key={topic.topic + i} className="topic-item">
          <div className="topic-rank">{i + 1}</div>
          <div className="topic-info">
            <div className="topic-name">{topic.topic} <span style={{ fontSize: "0.7rem", color: "var(--text3)", marginInlineStart: "0.5rem" }}>{leanText[topic.lean]}</span></div>
            <div className="topic-bar-bg"><div className="topic-bar-fill" style={{ width: `${(topic.count / max) * 100}%` }} /></div>
          </div>
          <div className="topic-count">{topic.count} {t("panels.competitor.mentions")}</div>
        </div>
      ))}
    </>
  );
}

function InsightsList({ result }: { result: AnalysisResult }) {
  const { t } = useI18n();
  const total = result.totalReviews || 1;
  const negPct = (result.sentiment.negative / total) * 100;
  const posPct = (result.sentiment.positive / total) * 100;
  const mixPct = (result.sentiment.mixed / total) * 100;
  const insights: { kind: string; text: string }[] = [];
  if (negPct > 40) insights.push({ kind: "danger", text: t("panels.competitor.insight_high_neg") });
  if (posPct > 60) insights.push({ kind: "success", text: t("panels.competitor.insight_loved") });
  if (result.topics[0]) insights.push({ kind: "warn", text: t("panels.competitor.insight_top_topic", { topic: result.topics[0].topic }) });
  if (result.pains.length > 0) insights.push({ kind: "info", text: t("panels.competitor.insight_pains", { n: result.pains.length }) });
  if (mixPct > 25) insights.push({ kind: "warn", text: t("panels.competitor.insight_mixed") });
  if (insights.length === 0) insights.push({ kind: "info", text: t("panels.competitor.insight_neutral") });
  return (
    <>
      {insights.map((ins, i) => (
        <div key={i} className={`insight-box ${ins.kind}`}>{ins.text}</div>
      ))}
    </>
  );
}

export function CompetitorAnalysis() {
  const { t, lang } = useI18n();
  const analyze = useServerFn(analyzeReviewsFn);
  const [products, setProducts] = useState<Competitor[]>([
    { id: crypto.randomUUID(), name: "", reviews: "" },
  ]);
  const reportRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [exporting, setExporting] = useState<string | null>(null);

  const runAnalyze = async (id: string) => {
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, loading: true, error: undefined } : p)));
    const target = products.find((p) => p.id === id);
    if (!target) return;
    const reviews = target.reviews.split("\n").map((r) => r.trim()).filter(Boolean);
    if (reviews.length === 0) {
      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, loading: false, error: t("panels.competitor.empty") } : p)));
      return;
    }
    try {
      const result = await analyze({ data: { productName: target.name, reviews } });
      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, result, loading: false } : p)));
    } catch (e) {
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, loading: false, error: e instanceof Error ? e.message : t("panels.competitor.error") } : p)),
      );
    }
  };

  const loadDemo = (id: string, idx: number) => {
    const dataset = COMPETITOR_DEMOS[lang];
    const pick = dataset[idx % dataset.length];
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, name: pick.name, reviews: pick.reviews.join("\n") } : p)));
  };

  const exportPdf = async (id: string, name: string) => {
    const el = reportRefs.current[id];
    if (!el) return;
    try {
      setExporting(id);
      const safe = (name || "competitor-analysis").replace(/[^\w\u0621-\u064A -]/g, "_").slice(0, 60);
      await exportElementToPdf(el, `${safe}.pdf`);
    } finally {
      setExporting(null);
    }
  };

  return (
    <div>
      <div className="panel-header">
        <h2>
          <span className="icon-lead">📊</span> {t("panels.competitor.h2")}
        </h2>
        <button className="btn btn-outline btn-sm" onClick={() => setProducts((p) => [...p, { id: crypto.randomUUID(), name: "", reviews: "" }])}>
          + {t("panels.competitor.add_product")}
        </button>
      </div>

      {products.map((p, idx) => (
        <div key={p.id} className="dashboard-grid" style={{ marginBottom: "2rem" }} ref={(el) => { reportRefs.current[p.id] = el; }}>
          <div className="left-col">
            <Card
              title={
                <>
                  <span className="icon-lead">✏️</span> {t("panels.competitor.input_title")} — {t("panels.competitor.product_n")} {idx + 1}
                </>
              }
              right={
                products.length > 1 && (
                  <button className="btn btn-outline btn-sm" onClick={() => setProducts((prev) => prev.filter((x) => x.id !== p.id))}>
                    {t("panels.competitor.remove_product")}
                  </button>
                )
              }
            >
              <div className="input-group">
                <label>{t("panels.competitor.product_label")}</label>
                <input className="input-field" value={p.name} onChange={(e) => setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, name: e.target.value } : x)))} placeholder={t("panels.competitor.product_placeholder")} />
              </div>
              <div className="input-group">
                <label>{t("panels.competitor.reviews_label")}</label>
                <textarea className="input-field" rows={8} value={p.reviews} onChange={(e) => setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, reviews: e.target.value } : x)))} placeholder={t("panels.competitor.reviews_placeholder")} />
              </div>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <button className="btn btn-primary" onClick={() => runAnalyze(p.id)} disabled={p.loading}>
                  {p.loading ? t("panels.competitor.analyzing") : t("panels.competitor.analyze")}
                </button>
                <button className="btn btn-outline" onClick={() => loadDemo(p.id, idx)} disabled={p.loading}>
                  {t("panels.competitor.demo")}
                </button>
                {p.result && (
                  <button className="btn btn-outline" onClick={() => exportPdf(p.id, p.name)} disabled={exporting === p.id}>
                    📄 {exporting === p.id ? "…" : t("panels.competitor.export_pdf")}
                  </button>
                )}
              </div>
              {p.error && <div className="insight-box danger" style={{ marginTop: "1rem" }}>{p.error}</div>}
              {p.loading && (
                <div className="loading active">
                  <div className="spinner" />
                  <div style={{ color: "var(--text2)", fontSize: "0.9rem" }}>{t("panels.competitor.analyzing")}</div>
                </div>
              )}
            </Card>

            {p.result && (
              <>
                <Card title={<><span className="icon-lead">🔥</span> {t("panels.competitor.topics_title")}</>}>
                  <TopicsList topics={p.result.topics} />
                </Card>
                <Card title={<><span className="icon-lead">⚠️</span> {t("panels.competitor.pains_title")}</>}>
                  {p.result.pains.length === 0 && <div className="pain-desc">—</div>}
                  {p.result.pains.map((pain, i) => (
                    <div key={i} className="pain-card">
                      <div className="pain-title">🔴 {pain.title}</div>
                      <div className="pain-desc">{pain.description}</div>
                      {pain.opportunity && <div className="insight-box info" style={{ marginTop: "0.5rem", fontSize: "0.8rem" }}>💡 {pain.opportunity}</div>}
                    </div>
                  ))}
                </Card>
                <Card title={<><span className="icon-lead">✅</span> {t("panels.competitor.strengths_title")}</>}>
                  {p.result.strengths.length === 0 && <div className="pain-desc">—</div>}
                  {p.result.strengths.map((s, i) => (
                    <div key={i} className="pain-card positive">
                      <div className="pain-title">🟢 {s.title}</div>
                      <div className="pain-desc">{s.description}</div>
                      {s.how_to_leverage && <div className="insight-box success" style={{ marginTop: "0.5rem", fontSize: "0.8rem" }}>💡 {s.how_to_leverage}</div>}
                    </div>
                  ))}
                </Card>
              </>
            )}
          </div>
          <div className="right-col">
            {p.result ? (
              <>
                <Card title={<><span className="icon-lead">📈</span> {t("panels.competitor.stats_title")}</>}>
                  <SentimentStats result={p.result} />
                </Card>
                <Card title={<><span className="icon-lead">💡</span> {t("panels.competitor.insights_title")}</>}>
                  <InsightsList result={p.result} />
                </Card>
              </>
            ) : (
              <Card>
                <div style={{ padding: "1rem", textAlign: "center", color: "var(--text3)", fontSize: "0.85rem" }}>{t("panels.competitor.empty")}</div>
              </Card>
            )}
          </div>
        </div>
      ))}

      <TrendView />
    </div>
  );
}

function TrendView() {
  const { t, lang } = useI18n();
  const loadHistory = useServerFn(loadAnalysisHistory);
  const [history, setHistory] = useState<AnalysisSummary[]>([]);
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!open || loaded) return;
    loadHistory().then(setHistory).catch(() => {}).finally(() => setLoaded(true));
  }, [open, loaded, loadHistory]);

  // Group by product_name, compute negative % trend over time
  const trendData = useMemo(() => {
    const groups = new Map<string, AnalysisSummary[]>();
    for (const h of history) {
      const key = h.product_name || "(unnamed)";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(h);
    }
    return Array.from(groups.entries()).map(([name, entries]) => {
      entries.sort((a, b) => a.created_at.localeCompare(b.created_at));
      const labels = entries.map((e) => new Date(e.created_at).toLocaleDateString(lang === "ar" ? "ar" : "en-US"));
      const negPct = entries.map((e) => {
        const total = e.totalReviews || 1;
        return (e.sentiment.negative / total) * 100;
      });
      const posPct = entries.map((e) => {
        const total = e.totalReviews || 1;
        return (e.sentiment.positive / total) * 100;
      });
      return { name, labels, negPct, posPct, count: entries.length };
    });
  }, [history, lang]);

  if (!open) {
    return (
      <div style={{ textAlign: "center", marginTop: "1.5rem" }}>
        <button className="btn btn-outline" onClick={() => setOpen(true)}>
          📈 {t("panels.competitor.trend_title")}
        </button>
      </div>
    );
  }

  if (!loaded) {
    return (
      <Card title={<><span className="icon-lead">📈</span> {t("panels.competitor.trend_title")}</>}>
        <div className="loading active"><div className="spinner" /></div>
      </Card>
    );
  }

  return (
    <Card title={<><span className="icon-lead">📈</span> {t("panels.competitor.trend_title")}</>}>
      {trendData.length === 0 ? (
        <div style={{ color: "var(--text3)", fontSize: "0.85rem", textAlign: "center", padding: "1rem" }}>
          {t("panels.competitor.trend_empty")}
        </div>
      ) : (
        <>
          {trendData.map((td) => (
            <div key={td.name} style={{ marginBottom: "1.5rem" }}>
              <div style={{ fontWeight: 700, fontSize: "0.9rem", marginBottom: "0.5rem" }}>
                {td.name} <span style={{ color: "var(--text3)", fontWeight: 400 }}>({td.count})</span>
              </div>
              <div style={{ height: 160 }}>
                <Line
                  data={{
                    labels: td.labels,
                    datasets: [
                      { label: t("panels.competitor.trend_negative"), data: td.negPct, borderColor: "#ef4444", backgroundColor: "rgba(239,68,68,0.1)", fill: true, tension: 0.35 },
                      { label: t("panels.competitor.trend_positive"), data: td.posPct, borderColor: "#22c55e", backgroundColor: "rgba(34,197,94,0.1)", fill: true, tension: 0.35 },
                    ],
                  }}
                  options={{
                    maintainAspectRatio: false,
                    plugins: { legend: { labels: { color: "#a1a1aa", font: { size: 10 } } } },
                    scales: {
                      x: { ticks: { color: "#71717a", font: { size: 9 } }, grid: { color: "rgba(255,255,255,0.05)" } },
                      y: { ticks: { color: "#71717a", font: { size: 9 } }, grid: { color: "rgba(255,255,255,0.05)" } },
                    },
                  }}
                />
              </div>
            </div>
          ))}
        </>
      )}
    </Card>
  );
}

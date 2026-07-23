import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Title,
} from "chart.js";
import { Doughnut, Line } from "react-chartjs-2";
import { useI18n } from "@/i18n/context";
import { CURRENCIES, formatMoney, type Currency } from "@/lib/currency";
import { findAlternative, SAAS_CATEGORIES } from "@/lib/saas-alts";
import { analyzeReviewsFn } from "@/lib/claude.functions";
import type { AnalysisResult } from "@/lib/claude.server";
import {
  loadSaasStack,
  saveSaasStack,
  loadPricingState,
  savePricingState,
  loadRoiState,
  saveRoiState,
  type SaasTool,
  type PricingState,
  type RoiState,
} from "@/lib/persistence.functions";
import { deleteMyAccount } from "@/lib/account.functions";

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Filler, Title);

type ModuleKey = "competitor" | "saas" | "pricing" | "roi";

// --- Debounce helper -------------------------------------------------------
function useDebouncedEffect(effect: () => void, deps: unknown[], delay = 600) {
  useEffect(() => {
    const id = setTimeout(effect, delay);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, delay]);
}

// --- PDF export (html2canvas + jsPDF, lazy-loaded to keep initial bundle slim) ---
async function exportElementToPdf(el: HTMLElement, filename: string) {
  const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);
  const canvas = await html2canvas(el, { backgroundColor: "#0a0a0f", scale: 2, useCORS: true });
  const img = canvas.toDataURL("image/png");
  const pdf = new jsPDF({ orientation: "p", unit: "pt", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const ratio = Math.min(pageW / canvas.width, pageH / canvas.height);
  const w = canvas.width * ratio;
  const h = canvas.height * ratio;
  pdf.addImage(img, "PNG", (pageW - w) / 2, 20, w, h);
  pdf.save(filename);
}

// --- CSV parser (bank/card statement style: description + amount columns) ---
function parseCsvToTools(text: string): SaasTool[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];
  const splitRow = (line: string): string[] => {
    // Minimal CSV: handles quoted fields with commas.
    const out: string[] = [];
    let cur = "";
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') { inQ = !inQ; continue; }
      if (c === "," && !inQ) { out.push(cur); cur = ""; continue; }
      cur += c;
    }
    out.push(cur);
    return out.map((s) => s.trim());
  };
  const header = splitRow(lines[0]).map((h) => h.toLowerCase());
  const descIdx = header.findIndex((h) => /vendor|description|merchant|payee|name|memo|narrative/.test(h));
  const amtIdx = header.findIndex((h) => /amount|debit|charge|price|cost|total/.test(h));
  const hasHeader = descIdx !== -1 && amtIdx !== -1;
  const startRow = hasHeader ? 1 : 0;
  const tools: SaasTool[] = [];
  const seen = new Map<string, SaasTool>();
  for (let i = startRow; i < lines.length; i++) {
    const cols = splitRow(lines[i]);
    let name = "";
    let cost = 0;
    if (hasHeader) {
      name = cols[descIdx] ?? "";
      cost = Math.abs(Number(String(cols[amtIdx] ?? "").replace(/[^0-9.\-]/g, ""))) || 0;
    } else {
      // Heuristic: first non-numeric col = name, first numeric-looking col = amount.
      for (const c of cols) {
        const n = Number(String(c).replace(/[^0-9.\-]/g, ""));
        if (!name && !Number.isFinite(n)) name = c;
        else if (!name && (c || "").match(/[a-zA-Zء-ي]/)) name = c;
        else if (!cost && Number.isFinite(n) && n !== 0) cost = Math.abs(n);
      }
    }
    name = name.replace(/^["']|["']$/g, "").trim();
    if (!name || cost <= 0) continue;
    const key = name.toLowerCase();
    const prev = seen.get(key);
    if (prev) {
      prev.cost = Math.max(prev.cost, cost); // keep the highest monthly charge
    } else {
      const tool: SaasTool = {
        id: crypto.randomUUID(),
        name,
        category: findAlternative(name)?.category ?? "",
        cost,
        users: 1,
        usage: 100,
      };
      seen.set(key, tool);
      tools.push(tool);
    }
  }
  return tools;
}

// --- Shared UI -------------------------------------------------------------
function Card({ title, children, right }: { title?: React.ReactNode; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="card">
      {(title || right) && (
        <div className="card-header">
          {title && <div className="card-title">{title}</div>}
          {right}
        </div>
      )}
      {children}
    </div>
  );
}

// --- Competitor Analysis ---------------------------------------------------
interface Competitor { id: string; name: string; reviews: string; result?: AnalysisResult; loading?: boolean; error?: string; }

// Per-language demo datasets with product-name variants per slot (bug #4).
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

function CompetitorAnalysis() {
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
                    </div>
                  ))}
                </Card>
                <Card title={<><span className="icon-lead">✅</span> {t("panels.competitor.strengths_title")}</>}>
                  {p.result.strengths.length === 0 && <div className="pain-desc">—</div>}
                  {p.result.strengths.map((s, i) => (
                    <div key={i} className="pain-card positive">
                      <div className="pain-title">🟢 {s.title}</div>
                      <div className="pain-desc">{s.description}</div>
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
    </div>
  );
}

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

// --- SaaS Audit ------------------------------------------------------------
function SaasAudit({ currency }: { currency: Currency }) {
  const { t } = useI18n();
  const load = useServerFn(loadSaasStack);
  const save = useServerFn(saveSaasStack);
  const [tools, setToolsState] = useState<SaasTool[]>([]);
  const [hydrated, setHydrated] = useState(false);
  // Undo / redo history — stored in state so buttons re-render on change.
  // Each entry is a snapshot of the tools array at a distinct data state.
  const [history, setHistory] = useState<SaasTool[][]>([]);
  const [future, setFuture] = useState<SaasTool[][]>([]);

  // Migration cost inputs (feature #6): qualitative sliders that reduce savings.
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

  // Deep equality: only push a snapshot when the tool data actually changed.
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

  // History-aware setter — snapshots current tools before mutating,
  // but only when the resulting state is genuinely different.
  const applyTools = useCallback((next: SaasTool[] | ((prev: SaasTool[]) => SaasTool[])) => {
    setToolsState((prev) => {
      const resolved = typeof next === "function" ? (next as (p: SaasTool[]) => SaasTool[])(prev) : next;
      if (sameTools(prev, resolved)) return prev; // no-op → no history entry
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

  // Keyboard shortcuts for undo/redo, scoped to this panel via window listener.
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
    { id: crypto.randomUUID(), name: "Salesforce", category: "CRM", cost: 150, users: 10, usage: 60 },
    { id: crypto.randomUUID(), name: "Slack", category: "Communication", cost: 8, users: 25, usage: 95 },
    { id: crypto.randomUUID(), name: "Figma", category: "Design", cost: 15, users: 5, usage: 80 },
    { id: crypto.randomUUID(), name: "Zoom", category: "Communication", cost: 20, users: 15, usage: 45 },
    { id: crypto.randomUUID(), name: "Notion", category: "Project Management", cost: 10, users: 20, usage: 70 },
    { id: crypto.randomUUID(), name: "Mailchimp", category: "Marketing", cost: 50, users: 3, usage: 30 },
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

  // Feature #6: qualitative migration cost model.
  // Base = per-migratable-tool switching effort × team size × complexity + training × risk.
  const migrationCost = useMemo(() => {
    if (stats.migratable === 0) return 0;
    const perToolHours = 8 * complexity;                    // hours per migratable tool
    const hourlyRate = 40;                                  // blended $/hr
    const laborCost = stats.migratable * perToolHours * hourlyRate;
    const trainingCost = teamSize * 100 * complexity;       // training + docs
    const riskBuffer = laborCost * (risk / 10);             // extra buffer for risky migrations
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
    if (stats.topCost.value > 0) out.push({ kind: "warn", text: t("panels.saas.insight_top_cost", { name: stats.topCost.name, money: formatMoney(stats.topCost.value, currency) }) });
    if (stats.lowUse.name && stats.lowUse.pct < 50) out.push({ kind: "danger", text: t("panels.saas.insight_low_use", { name: stats.lowUse.name, pct: Math.round(stats.lowUse.pct) }) });
    if (stats.migratable > 0) out.push({ kind: "success", text: t("panels.saas.insight_ready", { n: stats.migratable, total: tools.filter((x) => x.name).length }) });
    if (stats.savings > 0 && stats.annual > 0) out.push({ kind: "info", text: t("panels.saas.insight_savings", { pct: Math.round((stats.savings / stats.annual) * 100), money: formatMoney(stats.savings, currency) }) });
    if (stats.waste > 0) out.push({ kind: "warn", text: t("panels.saas.insight_waste", { money: formatMoney(stats.waste, currency) }) });
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
                        <div className="save">{t("panels.saas.save_per_year", { money: formatMoney(save, currency) })}</div>
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
                <div className="stat-value" style={{ color: "var(--danger)", fontSize: "1.05rem" }}>{formatMoney(migrationCost, currency)}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">{t("panels.saas.net_savings")}</div>
                <div className="stat-value" style={{ color: netSavings > 0 ? "var(--success)" : "var(--text2)", fontSize: "1.05rem" }}>{formatMoney(netSavings, currency)}</div>
              </div>
            </div>
          </Card>
        </div>

        <div className="right-col">
          <div className="summary-card">
            <div className="label">{t("panels.saas.total_annual")}</div>
            <div className="value">{formatMoney(stats.annual, currency)}</div>
            {stats.savings > 0 && (
              <div className="savings">
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "0.7rem", opacity: 0.85 }}>{t("panels.saas.potential_savings")}</div>
                  <div className="amount">{formatMoney(stats.savings, currency)}</div>
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
    </div>

  );
}

// --- Pricing Calculator ---------------------------------------------------
function PricingCalculator({ currency }: { currency: Currency }) {
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
            <div className="big">{formatMoney(optimal, currency)}</div>
            <div style={{ fontSize: "0.85rem", opacity: 0.85 }}>{modelLabel}</div>
          </div>

          {state.competitor > 0 && (
            <Card title={<><span className="icon-lead">⚖️</span> {t("panels.pricing.compare_title")}</>}>
              <div className="stats-grid">
                <div className="stat-card"><div className="stat-label">{t("panels.pricing.your_price")}</div><div className="stat-value" style={{ color: "var(--accent)" }}>{formatMoney(optimal, currency)}</div></div>
                <div className="stat-card"><div className="stat-label">{t("panels.pricing.comp_price")}</div><div className="stat-value">{formatMoney(state.competitor, currency)}</div></div>
                <div className="stat-card"><div className="stat-label">{t("panels.pricing.diff")}</div><div className={`stat-value ${diff < 0 ? "positive" : "negative"}`}>{diff > 0 ? "+" : ""}{diff.toFixed(1)}%</div></div>
              </div>
            </Card>
          )}

          <Card title={<><span className="icon-lead">📈</span> {t("panels.pricing.projections_title")}</>}>
            <div className="stats-grid">
              <div className="stat-card"><div className="stat-label">{t("panels.pricing.revenue")}</div><div className="stat-value" style={{ fontSize: "1.15rem" }}>{formatMoney(revenue, currency)}</div></div>
              <div className="stat-card"><div className="stat-label">{t("panels.pricing.profit")}</div><div className={`stat-value ${profit >= 0 ? "positive" : "negative"}`} style={{ fontSize: "1.15rem" }}>{formatMoney(profit, currency)}</div></div>
              <div className="stat-card"><div className="stat-label">{t("panels.pricing.annual")}</div><div className="stat-value" style={{ fontSize: "1.15rem" }}>{formatMoney(annual, currency)}</div></div>
              <div className="stat-card"><div className="stat-label">{t("panels.pricing.break_even")}</div><div className="stat-value warning" style={{ fontSize: "1.15rem" }}>{breakEven}</div></div>
            </div>
          </Card>
        </div>
      </div>
    </div>

  );
}

// --- ROI Calculator -------------------------------------------------------
function RoiCalculator({ currency }: { currency: Currency }) {
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
  if (monthlyNet !== 0) insights.push({ kind: "info", text: t("panels.roi.net_monthly", { money: formatMoney(monthlyNet, currency) }) });
  if (net !== 0) insights.push({ kind: net > 0 ? "success" : "danger", text: t("panels.roi.net_period", { p: state.period, money: formatMoney(net, currency) }) });

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
              <div className="roi-result"><div className="num" style={{ color: "var(--danger)" }}>{formatMoney(totalCost, currency)}</div><div className="lbl">{t("panels.roi.total_cost")}</div></div>
              <div className="roi-result"><div className="num" style={{ color: "var(--success)" }}>{formatMoney(totalGain, currency)}</div><div className="lbl">{t("panels.roi.total_gain")}</div></div>
              <div className="roi-result"><div className="num" style={{ color: net >= 0 ? "var(--success)" : "var(--danger)" }}>{formatMoney(net, currency)}</div><div className="lbl">{t("panels.roi.net")}</div></div>
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

// --- Main dashboard shell -------------------------------------------------
export function DashboardApp() {
  const { t, lang, setLang } = useI18n();
  const [active, setActive] = useState<ModuleKey>("competitor");
  const [currency, setCurrency] = useState<Currency>(() => (typeof window !== "undefined" && (localStorage.getItem("mis_currency") as Currency)) || "USD");
  const [theme, setTheme] = useState<"dark" | "light" | "auto">(() => (typeof window !== "undefined" && (localStorage.getItem("mis_theme") as "dark" | "light" | "auto")) || "dark");

  useEffect(() => {
    if (typeof document === "undefined") return;
    const apply = () => {
      const resolved = theme === "auto"
        ? (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark")
        : theme;
      document.body.classList.toggle("light-mode", resolved === "light");
    };
    apply();
    localStorage.setItem("mis_theme", theme);
    if (theme === "auto") {
      const mq = window.matchMedia("(prefers-color-scheme: light)");
      mq.addEventListener("change", apply);
      return () => mq.removeEventListener("change", apply);
    }
  }, [theme]);

  useEffect(() => { if (typeof window !== "undefined") localStorage.setItem("mis_currency", currency); }, [currency]);

  // Keyboard shortcuts: Alt+1..4 to switch modules
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!e.altKey) return;
      const keys: Record<string, ModuleKey> = { "1": "competitor", "2": "saas", "3": "pricing", "4": "roi" };
      const k = keys[e.key];
      if (k) { e.preventDefault(); setActive(k); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const signOut = async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const deleteAcct = useServerFn(deleteMyAccount);
  const [deleting, setDeleting] = useState(false);
  const runDelete = async () => {
    if (!window.confirm(`${t("delete.confirm_title")}\n\n${t("delete.confirm_body")}`)) return;
    setDeleting(true);
    try {
      await deleteAcct();
      const { supabase } = await import("@/integrations/supabase/client");
      await supabase.auth.signOut();
      window.location.href = "/";
    } catch (e) {
      setDeleting(false);
      window.alert(t("delete.error") + (e instanceof Error ? `\n${e.message}` : ""));
    }
  };

  const cards: { key: ModuleKey; icon: string; klass: string; title: string; desc: string; badge: string; shortcut: string }[] = [
    { key: "competitor", icon: "📊", klass: "purple", title: t("cards.competitor.title"), desc: t("cards.competitor.desc"), badge: t("cards.competitor.badge"), shortcut: "Alt+1" },
    { key: "saas", icon: "💼", klass: "orange", title: t("cards.saas.title"), desc: t("cards.saas.desc"), badge: t("cards.saas.badge"), shortcut: "Alt+2" },
    { key: "pricing", icon: "💰", klass: "green", title: t("cards.pricing.title"), desc: t("cards.pricing.desc"), badge: t("cards.pricing.badge"), shortcut: "Alt+3" },
    { key: "roi", icon: "📈", klass: "blue", title: t("cards.roi.title"), desc: t("cards.roi.desc"), badge: t("cards.roi.badge"), shortcut: "Alt+4" },
  ];

  return (
    <>
      <div className="bg-mesh" />
      <nav className="nav">
        <div className="logo">
          <div className="logo-icon">MI</div>
          <span>Market Intelligence</span>
        </div>
        <div className="nav-actions">
          <select className="nav-btn" value={currency} onChange={(e) => setCurrency(e.target.value as Currency)} title={t("currency.label")}>
            {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.symbol} {c.code}</option>)}
          </select>
          <select className="nav-btn" value={theme} onChange={(e) => setTheme(e.target.value as "dark" | "light" | "auto")} title={t("nav.theme")}>
            <option value="dark">🌙 {t("theme.dark")}</option>
            <option value="light">☀️ {t("theme.light")}</option>
            <option value="auto">🖥️ {t("theme.auto")}</option>
          </select>

          <button className="nav-btn" onClick={() => setLang(lang === "ar" ? "en" : "ar")}>{t("nav.language")}</button>
          <button className="nav-btn" onClick={signOut}>{t("nav.signout")}</button>
          <button className="nav-btn" onClick={runDelete} disabled={deleting} style={{ color: "var(--danger)" }}>
            {deleting ? t("delete.deleting") : `🗑 ${t("nav.delete_account")}`}
          </button>
        </div>
      </nav>

      <section className="hero" style={{ paddingBottom: "1.5rem" }}>
        <div className="badge"><span className="badge-dot" />{t("hero.badge")}</div>
        <h1><span>{t("hero.title.a")}</span> {t("hero.title.b")}</h1>
      </section>

      <div className="tools-grid">
        {cards.map((c) => (
          <div key={c.key} className={`tool-card ${active === c.key ? "active" : ""}`} onClick={() => setActive(c.key)}>
            <div className={`tool-icon ${c.klass}`}>{c.icon}</div>
            <h3>{c.title}</h3>
            <p>{c.desc}</p>
            <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginTop: "0.75rem" }}>
              <span className="tool-badge">{c.badge}</span>
              <span className="tool-badge" style={{ fontFamily: "monospace" }}>{c.shortcut}</span>
            </div>
          </div>
        ))}
      </div>

      <div className={`app-panel ${active === "competitor" ? "active" : ""}`}>{active === "competitor" && <CompetitorAnalysis />}</div>
      <div className={`app-panel ${active === "saas" ? "active" : ""}`}>{active === "saas" && <SaasAudit currency={currency} />}</div>
      <div className={`app-panel ${active === "pricing" ? "active" : ""}`}>{active === "pricing" && <PricingCalculator currency={currency} />}</div>
      <div className={`app-panel ${active === "roi" ? "active" : ""}`}>{active === "roi" && <RoiCalculator currency={currency} />}</div>

      <div className="footer">{t("footer.tagline")}</div>
    </>
  );
}

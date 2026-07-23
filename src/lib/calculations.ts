// Pure calculation functions extracted from the UI modules so they can be
// unit-tested without rendering React components. These mirror the exact
// formulas used in PricingCalculator, RoiCalculator, and SaasAudit.

import { findAlternative, type SaasAlternative } from "./saas-alts";

// ---- Pricing ----

export interface PricingInput {
  cost: number;
  customers: number;
  competitor: number;
  margin: number;
}

export function calcOptimalPrice(input: PricingInput): number {
  if (input.customers === 0) return 0;
  const raw = (input.cost / input.customers) * (1 + input.margin / 100);
  return Math.round(raw / 5) * 5;
}

export interface PricingResult {
  optimal: number;
  revenue: number;
  profit: number;
  annual: number;
  breakEven: number;
  diffPct: number;
}

export function calcPricing(input: PricingInput): PricingResult {
  const optimal = calcOptimalPrice(input);
  const revenue = optimal * input.customers;
  const profit = revenue - input.cost;
  const annual = revenue * 12;
  const breakEven = optimal > 0 ? Math.ceil(input.cost / optimal) : 0;
  const diffPct = input.competitor > 0 ? ((optimal - input.competitor) / input.competitor) * 100 : 0;
  return { optimal, revenue, profit, annual, breakEven, diffPct };
}

// ---- ROI ----

export interface RoiInput {
  initial: number;
  monthly: number;
  savings: number;
  revenue: number;
  period: number;
}

export interface RoiResult {
  totalCost: number;
  totalGain: number;
  net: number;
  roiPct: number;
  monthlyNet: number;
  beMonth: number;
  beReached: boolean;
}

export function calcRoi(input: RoiInput): RoiResult {
  const totalCost = input.initial + input.monthly * input.period;
  const totalGain = (input.savings + input.revenue) * input.period;
  const net = totalGain - totalCost;
  const roiPct = totalCost > 0 ? (net / totalCost) * 100 : 0;
  const monthlyNet = input.savings + input.revenue - input.monthly;
  const beMonth = monthlyNet > 0 ? Math.ceil(input.initial / monthlyNet) : 0;
  const beReached = beMonth > 0 && beMonth <= input.period;
  return { totalCost, totalGain, net, roiPct, monthlyNet, beMonth, beReached };
}

// ---- SaaS savings ----

export interface SaasToolInput {
  name: string;
  category: string;
  cost: number;
  users: number;
  usage: number;
}

export interface SaasStats {
  annual: number;
  savings: number;
  waste: number;
  topCost: { name: string; value: number };
  lowUse: { name: string; pct: number };
  migratable: number;
}

export function calcSaasStats(tools: SaasToolInput[]): SaasStats {
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
}

export interface MigrationCostInput {
  migratable: number;
  teamSize: number;
  complexity: number;
  risk: number;
}

export function calcMigrationCost(input: MigrationCostInput): number {
  if (input.migratable === 0) return 0;
  const perToolHours = 8 * input.complexity;
  const hourlyRate = 40;
  const laborCost = input.migratable * perToolHours * hourlyRate;
  const trainingCost = input.teamSize * 100 * input.complexity;
  const riskBuffer = laborCost * (input.risk / 10);
  return Math.round(laborCost + trainingCost + riskBuffer);
}

export function calcNetSavings(savings: number, migrationCost: number): number {
  return Math.max(0, savings - migrationCost);
}

// ---- Sentiment scoring (mirrors InsightsList logic) ----

export interface SentimentInput {
  totalReviews: number;
  positive: number;
  negative: number;
  mixed: number;
  neutral: number;
}

export interface SentimentScore {
  negPct: number;
  posPct: number;
  mixPct: number;
  dominant: "positive" | "negative" | "mixed" | "neutral";
}

export function scoreSentiment(input: SentimentInput): SentimentScore {
  const total = input.totalReviews || 1;
  const negPct = (input.negative / total) * 100;
  const posPct = (input.positive / total) * 100;
  const mixPct = (input.mixed / total) * 100;
  let dominant: SentimentScore["dominant"] = "neutral";
  if (posPct > negPct && posPct > mixPct) dominant = "positive";
  else if (negPct > posPct && negPct > mixPct) dominant = "negative";
  else if (mixPct > posPct && mixPct > negPct) dominant = "mixed";
  return { negPct, posPct, mixPct, dominant };
}

// Automated tests for core calculation logic.
// Run with: npx tsx --test src/lib/calculations.test.ts
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calcOptimalPrice,
  calcPricing,
  calcRoi,
  calcSaasStats,
  calcMigrationCost,
  calcNetSavings,
  scoreSentiment,
} from "./calculations";

describe("calcOptimalPrice", () => {
  it("returns 0 when no customers", () => {
    assert.equal(calcOptimalPrice({ cost: 1000, customers: 0, competitor: 50, margin: 30 }), 0);
  });

  it("rounds to nearest 5", () => {
    const p = calcOptimalPrice({ cost: 1000, customers: 10, competitor: 0, margin: 30 });
    assert.equal(p % 5, 0);
    assert.equal(p, 130);
  });

  it("handles zero cost", () => {
    assert.equal(calcOptimalPrice({ cost: 0, customers: 10, competitor: 0, margin: 30 }), 0);
  });
});

describe("calcPricing", () => {
  it("computes revenue, profit, annual, breakEven, diffPct", () => {
    const r = calcPricing({ cost: 1000, customers: 10, competitor: 150, margin: 30 });
    assert.equal(r.optimal, 130);
    assert.equal(r.revenue, 1300);
    assert.equal(r.profit, 300);
    assert.equal(r.annual, 15600);
    assert.equal(r.breakEven, 8);
    assert.ok(r.diffPct < 0);
  });

  it("diffPct is 0 when no competitor", () => {
    const r = calcPricing({ cost: 1000, customers: 10, competitor: 0, margin: 30 });
    assert.equal(r.diffPct, 0);
  });
});

describe("calcRoi", () => {
  it("computes total cost and gain correctly", () => {
    const r = calcRoi({ initial: 1000, monthly: 100, savings: 300, revenue: 200, period: 12 });
    assert.equal(r.totalCost, 1000 + 100 * 12);
    assert.equal(r.totalGain, (300 + 200) * 12);
    assert.equal(r.net, r.totalGain - r.totalCost);
  });

  it("calculates break-even month", () => {
    const r = calcRoi({ initial: 1000, monthly: 100, savings: 300, revenue: 200, period: 12 });
    assert.equal(r.monthlyNet, 400);
    assert.equal(r.beMonth, 3);
    assert.equal(r.beReached, true);
  });

  it("returns beReached false when not reached in period", () => {
    const r = calcRoi({ initial: 10000, monthly: 100, savings: 50, revenue: 50, period: 6 });
    assert.equal(r.monthlyNet, 0);
    assert.equal(r.beMonth, 0);
    assert.equal(r.beReached, false);
  });

  it("roiPct is 0 when totalCost is 0", () => {
    const r = calcRoi({ initial: 0, monthly: 0, savings: 100, revenue: 0, period: 12 });
    assert.equal(r.roiPct, 0);
  });
});

describe("calcSaasStats", () => {
  it("computes annual, savings, waste, topCost, lowUse, migratable", () => {
    const tools = [
      { name: "Slack", category: "Communication", cost: 8, users: 25, usage: 95 },
      { name: "Salesforce", category: "CRM", cost: 150, users: 10, usage: 60 },
    ];
    const s = calcSaasStats(tools);
    assert.equal(s.annual, (8 * 25 + 150 * 10) * 12);
    assert.ok(s.savings > 0);
    assert.ok(s.waste > 0);
    assert.equal(s.topCost.name, "Salesforce");
    assert.equal(s.lowUse.name, "Salesforce");
    assert.equal(s.migratable, 2);
  });

  it("returns zero stats for empty list", () => {
    const s = calcSaasStats([]);
    assert.equal(s.annual, 0);
    assert.equal(s.savings, 0);
    assert.equal(s.migratable, 0);
  });

  it("handles tools with no alternatives", () => {
    const s = calcSaasStats([{ name: "UnknownTool", category: "Other", cost: 50, users: 5, usage: 100 }]);
    assert.equal(s.migratable, 0);
    assert.equal(s.savings, 0);
    assert.equal(s.annual, 50 * 5 * 12);
  });
});

describe("calcMigrationCost", () => {
  it("returns 0 when no migratable tools", () => {
    assert.equal(calcMigrationCost({ migratable: 0, teamSize: 10, complexity: 3, risk: 3 }), 0);
  });

  it("computes labor + training + risk buffer", () => {
    const cost = calcMigrationCost({ migratable: 2, teamSize: 5, complexity: 3, risk: 2 });
    const labor = 2 * 8 * 3 * 40;
    const training = 5 * 100 * 3;
    const riskBuf = labor * (2 / 10);
    assert.equal(cost, Math.round(labor + training + riskBuf));
  });
});

describe("calcNetSavings", () => {
  it("returns max(0, savings - migrationCost)", () => {
    assert.equal(calcNetSavings(5000, 2000), 3000);
    assert.equal(calcNetSavings(1000, 3000), 0);
  });
});

describe("scoreSentiment", () => {
  it("identifies negative-dominant sentiment", () => {
    const s = scoreSentiment({ totalReviews: 10, positive: 2, negative: 6, mixed: 1, neutral: 1 });
    assert.equal(s.dominant, "negative");
    assert.equal(s.negPct, 60);
  });

  it("identifies positive-dominant sentiment", () => {
    const s = scoreSentiment({ totalReviews: 10, positive: 7, negative: 1, mixed: 1, neutral: 1 });
    assert.equal(s.dominant, "positive");
    assert.equal(s.posPct, 70);
  });

  it("identifies mixed-dominant sentiment", () => {
    const s = scoreSentiment({ totalReviews: 10, positive: 2, negative: 2, mixed: 5, neutral: 1 });
    assert.equal(s.dominant, "mixed");
    assert.equal(s.mixPct, 50);
  });

  it("defaults to neutral when balanced", () => {
    const s = scoreSentiment({ totalReviews: 4, positive: 1, negative: 1, mixed: 1, neutral: 1 });
    assert.equal(s.dominant, "neutral");
  });

  it("handles zero totalReviews without div-by-zero", () => {
    const s = scoreSentiment({ totalReviews: 0, positive: 0, negative: 0, mixed: 0, neutral: 0 });
    assert.equal(s.negPct, 0);
    assert.equal(s.dominant, "neutral");
  });
});

// @ts-ignore
import test from "node:test";
// @ts-ignore
import assert from "node:assert/strict";
import { GlobalTradeFinanceEngine } from "./simulator.js";
import { ImportOperationInput } from "./types.js";

test("GlobalTradeFinanceEngine: correctly calculates landed cost and milestones", () => {
  const input: ImportOperationInput = {
    operationRef: "IMP-2026-CH-001",
    commodityName: "Dense Soda Ash Grade A",
    cargoMode: "BULK",
    metricTons: 1000,
    pricePerTonUsd: 280, // $280,000 commercial
    oceanFreightUsd: 45000,
    insuranceUsd: 2500,
    portTerminalFeesUsd: 12500,
    intermediaryCommissionPct: 5, // 5% on $280k = $14k
  };

  const analysis = GlobalTradeFinanceEngine.analyzeOperation(input, 5.80);

  assert.equal(analysis.commercialValueUsd, 280000);
  assert.equal(analysis.totalFreightAndLogisticsUsd, 60000);
  // Total landed: 280k + 60k + 14k = 354,000 USD
  assert.equal(analysis.totalLandedCostUsd, 354000);
  assert.equal(analysis.landedCostPerTonUsd, 354);

  // Check 20/60/20 milestones
  assert.equal(analysis.installments.length, 3);
  assert.equal(analysis.installments[0].amountUsd, 70800); // 20%
  assert.equal(analysis.installments[1].amountUsd, 212400); // 60%
  assert.equal(analysis.installments[2].amountUsd, 70800); // 20%
});

test("GlobalTradeFinanceEngine: computes stress PTAX currency exposure accurately", () => {
  const input: ImportOperationInput = {
    operationRef: "IMP-2026-MN-002",
    commodityName: "Silico-Manganese 65/17",
    cargoMode: "BULK",
    metricTons: 500,
    pricePerTonUsd: 1000, // $500,000
    oceanFreightUsd: 30000,
    insuranceUsd: 2000,
    portTerminalFeesUsd: 8000,
  };

  const analysis = GlobalTradeFinanceEngine.analyzeOperation(input, 5.50);

  // Base BRL cost: $540,000 * 5.50 = R$ 2,970,000
  const baseScenario = analysis.fxScenarios.find((s) => s.scenarioName === "BASE_EXPECTED")!;
  assert.equal(baseScenario.totalCostBrl, 2970000);
  assert.equal(baseScenario.fxVarianceAgainstBaseBrl, 0.0);

  // Stress scenario (+8% depreciation): Rate = 5.94, Cost = R$ 3,207,600 (+R$ 237,600)
  const stressScenario = analysis.fxScenarios.find((s) => s.scenarioName === "STRESS_DEPRECIATION")!;
  assert.equal(stressScenario.exchangeRateBrlPerUsd, 5.94);
  assert.equal(stressScenario.totalCostBrl, 3207600);
  assert.equal(stressScenario.fxVarianceAgainstBaseBrl, 237600);
});

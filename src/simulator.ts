import { ImportOperationInput, TradeFinanceAnalysis, PaymentInstallment, FXScenario } from "./types.js";

export class GlobalTradeFinanceEngine {
  /**
   * Decomposes total landed cost of an international maritime import operation
   * across freight, handling, and commercial commodity valuation.
   */
  public static analyzeOperation(
    input: ImportOperationInput,
    basePtaxRate: number = 5.80
  ): TradeFinanceAnalysis {
    if (input.metricTons <= 0 || input.pricePerTonUsd <= 0) {
      throw new Error("INVALID_OPERATION_DIMENSIONS: Metric tons and price must be positive.");
    }

    // 1. Raw commercial value
    const commercialValueUsd = input.metricTons * input.pricePerTonUsd;

    // 2. Logistics & freight calculation
    let calculatedFreightUsd = input.oceanFreightUsd;
    if (input.cargoMode === "CONTAINER") {
      const teus = (input.containerCount20ft ?? 0) + (input.containerCount40ft ?? 0) * 2;
      if (teus > 0 && input.oceanFreightUsd === 0) {
        calculatedFreightUsd = teus * 1850.0; // Default standard ocean rate per TEU
      }
    }

    const totalFreightAndLogisticsUsd =
      calculatedFreightUsd + input.insuranceUsd + input.portTerminalFeesUsd;

    // 3. Optional Intermediary Repass Commission (strictly applied to net commercial value)
    const commissionPct = (input.intermediaryCommissionPct ?? 0) / 100;
    const commissionUsd = commercialValueUsd * commissionPct;

    const totalLandedCostUsd = commercialValueUsd + totalFreightAndLogisticsUsd + commissionUsd;
    const landedCostPerTonUsd = totalLandedCostUsd / input.metricTons;

    // 4. Standard 20% / 60% / 20% Milestone Schedule
    const installments: PaymentInstallment[] = [
      {
        installmentNumber: 1,
        percentage: 20,
        amountUsd: Number((totalLandedCostUsd * 0.20).toFixed(2)),
        dueDate: "T+0 (Contract Execution)",
        triggerEvent: "ADVANCE_SIGNING",
      },
      {
        installmentNumber: 2,
        percentage: 60,
        amountUsd: Number((totalLandedCostUsd * 0.60).toFixed(2)),
        dueDate: "T+35 (Vessel Sailing / B/L)",
        triggerEvent: "BL_PRESENTATION",
      },
      {
        installmentNumber: 3,
        percentage: 20,
        amountUsd: Number((totalLandedCostUsd * 0.20).toFixed(2)),
        dueDate: "T+60 (Customs Release)",
        triggerEvent: "CUSTOMS_CLEARANCE",
      },
    ];

    // 5. FX Scenarios (PTAX volatility simulation: -4%, Base, +8% Stress)
    const baseTotalBrl = totalLandedCostUsd * basePtaxRate;
    const fxScenarios: FXScenario[] = [
      {
        scenarioName: "BEST_CASE",
        exchangeRateBrlPerUsd: Number((basePtaxRate * 0.96).toFixed(4)), // 4% currency gain
        totalCostBrl: Number((totalLandedCostUsd * (basePtaxRate * 0.96)).toFixed(2)),
        effectiveCostPerTonBrl: Number(((totalLandedCostUsd * (basePtaxRate * 0.96)) / input.metricTons).toFixed(2)),
        fxVarianceAgainstBaseBrl: Number((totalLandedCostUsd * (basePtaxRate * 0.96) - baseTotalBrl).toFixed(2)),
      },
      {
        scenarioName: "BASE_EXPECTED",
        exchangeRateBrlPerUsd: basePtaxRate,
        totalCostBrl: Number(baseTotalBrl.toFixed(2)),
        effectiveCostPerTonBrl: Number((baseTotalBrl / input.metricTons).toFixed(2)),
        fxVarianceAgainstBaseBrl: 0.0,
      },
      {
        scenarioName: "STRESS_DEPRECIATION",
        exchangeRateBrlPerUsd: Number((basePtaxRate * 1.08).toFixed(4)), // 8% currency shock
        totalCostBrl: Number((totalLandedCostUsd * (basePtaxRate * 1.08)).toFixed(2)),
        effectiveCostPerTonBrl: Number(((totalLandedCostUsd * (basePtaxRate * 1.08)) / input.metricTons).toFixed(2)),
        fxVarianceAgainstBaseBrl: Number((totalLandedCostUsd * (basePtaxRate * 1.08) - baseTotalBrl).toFixed(2)),
      },
    ];

    return {
      operationRef: input.operationRef,
      commercialValueUsd: Number(commercialValueUsd.toFixed(2)),
      totalFreightAndLogisticsUsd: Number(totalFreightAndLogisticsUsd.toFixed(2)),
      totalLandedCostUsd: Number(totalLandedCostUsd.toFixed(2)),
      landedCostPerTonUsd: Number(landedCostPerTonUsd.toFixed(2)),
      installments,
      fxScenarios,
    };
  }
}

export type CargoMode = "BULK" | "CONTAINER";
export type Incoterm = "FOB" | "CIF" | "CFR" | "DAP";

export interface ImportOperationInput {
  operationRef: string;
  commodityName: string;
  cargoMode: CargoMode;
  metricTons: number;
  pricePerTonUsd: number;
  oceanFreightUsd: number;
  containerCount20ft?: number;
  containerCount40ft?: number;
  insuranceUsd: number;
  portTerminalFeesUsd: number;
  intermediaryCommissionPct?: number; // e.g. 5%
}

export interface PaymentInstallment {
  installmentNumber: number;
  percentage: number;
  amountUsd: number;
  dueDate: string;
  triggerEvent: "ADVANCE_SIGNING" | "BL_PRESENTATION" | "CUSTOMS_CLEARANCE" | "POST_DELIVERY_30D";
}

export interface FXScenario {
  scenarioName: "BEST_CASE" | "BASE_EXPECTED" | "STRESS_DEPRECIATION";
  exchangeRateBrlPerUsd: number;
  totalCostBrl: number;
  effectiveCostPerTonBrl: number;
  fxVarianceAgainstBaseBrl: number;
}

export interface TradeFinanceAnalysis {
  operationRef: string;
  commercialValueUsd: number;
  totalFreightAndLogisticsUsd: number;
  totalLandedCostUsd: number;
  landedCostPerTonUsd: number;
  installments: PaymentInstallment[];
  fxScenarios: FXScenario[];
}

export type PaymentAuditEventType = "PAY_NOW_ACTIVATED" | "PAY_NOW_RESET" | "PAYMENT_SETTLED";

export interface PaymentAuditEvent {
  eventId: string;
  operationRef: string;
  installmentNumber: number;
  type: PaymentAuditEventType;
  actor: string;
  occurredAt: string;
  reason?: string;
}

export interface PaymentStatusProjection {
  operationRef: string;
  installmentNumber: number;
  isPayNowActive: boolean;
  isSettled: boolean;
  daysUntilDue: number;
  preDocContractWarning: boolean;
  auditTrailLength: number;
  lastEventType?: PaymentAuditEventType;
}

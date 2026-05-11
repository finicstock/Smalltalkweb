/**
 * 토스페이먼츠 정기결제 연동 모듈
 *
 * 이 파일은 토스페이먼츠 빌링키 기반 정기결제 API 구조를 포함합니다.
 * 실제 연동 시 TOSS_SECRET_KEY 환경변수를 설정하면 즉시 활성화됩니다.
 *
 * 연동 흐름:
 * 1. 프론트엔드에서 토스 SDK로 카드 정보 입력 → authKey 발급
 * 2. 서버에서 authKey로 빌링키(billingKey) 발급
 * 3. 빌링키로 정기결제 승인 요청
 * 4. 웹훅으로 결제 결과 수신 및 구독 상태 업데이트
 */

import axios from "axios";

// 환경변수에서 토스페이먼츠 시크릿 키 로드
const TOSS_SECRET_KEY = process.env.TOSS_SECRET_KEY ?? "";
const TOSS_API_BASE = "https://api.tosspayments.com/v1";

function getAuthHeader() {
  const encoded = Buffer.from(`${TOSS_SECRET_KEY}:`).toString("base64");
  return { Authorization: `Basic ${encoded}` };
}

export function isTossConfigured(): boolean {
  return !!TOSS_SECRET_KEY;
}

/**
 * Step 1: 빌링키 발급
 * 프론트에서 받은 authKey로 빌링키를 발급합니다.
 */
export async function issueBillingKey(params: {
  authKey: string;
  customerKey: string;
}): Promise<{
  billingKey: string;
  customerKey: string;
  cardCompany: string;
  cardNumber: string;
  method: string;
}> {
  if (!isTossConfigured()) {
    throw new Error("토스페이먼츠가 설정되지 않았습니다. TOSS_SECRET_KEY를 설정해 주세요.");
  }

  const response = await axios.post(
    `${TOSS_API_BASE}/billing/authorizations/issue`,
    {
      authKey: params.authKey,
      customerKey: params.customerKey,
    },
    { headers: { ...getAuthHeader(), "Content-Type": "application/json" } }
  );

  return {
    billingKey: response.data.billingKey,
    customerKey: response.data.customerKey,
    cardCompany: response.data.card?.issuerCode ?? "",
    cardNumber: response.data.card?.number ?? "",
    method: response.data.method ?? "카드",
  };
}

/**
 * Step 2: 빌링키로 자동 결제 승인
 */
export async function approveBillingPayment(params: {
  billingKey: string;
  customerKey: string;
  amount: number;
  orderId: string;
  orderName: string;
}): Promise<{
  paymentKey: string;
  orderId: string;
  status: string;
  approvedAt: string;
  totalAmount: number;
  method: string;
}> {
  if (!isTossConfigured()) {
    throw new Error("토스페이먼츠가 설정되지 않았습니다.");
  }

  const response = await axios.post(
    `${TOSS_API_BASE}/billing/${params.billingKey}`,
    {
      customerKey: params.customerKey,
      amount: params.amount,
      orderId: params.orderId,
      orderName: params.orderName,
    },
    { headers: { ...getAuthHeader(), "Content-Type": "application/json" } }
  );

  return {
    paymentKey: response.data.paymentKey,
    orderId: response.data.orderId,
    status: response.data.status,
    approvedAt: response.data.approvedAt,
    totalAmount: response.data.totalAmount,
    method: response.data.method,
  };
}

/**
 * Step 3: 결제 취소
 */
export async function cancelPayment(params: {
  paymentKey: string;
  cancelReason: string;
}): Promise<{ status: string }> {
  if (!isTossConfigured()) {
    throw new Error("토스페이먼츠가 설정되지 않았습니다.");
  }

  const response = await axios.post(
    `${TOSS_API_BASE}/payments/${params.paymentKey}/cancel`,
    { cancelReason: params.cancelReason },
    { headers: { ...getAuthHeader(), "Content-Type": "application/json" } }
  );

  return { status: response.data.status };
}

/**
 * Step 4: 웹훅 시그니처 검증
 */
export function verifyWebhookSignature(body: string, signature: string): boolean {
  if (!TOSS_SECRET_KEY) return false;
  const crypto = require("crypto");
  const expected = crypto
    .createHmac("sha256", TOSS_SECRET_KEY)
    .update(body)
    .digest("base64");
  return expected === signature;
}

/**
 * 결제 금액 계산 헬퍼
 */
export function calculateSubscriptionAmount(
  monthlyPrice: number,
  yearlyPrice: number,
  billingCycle: "monthly" | "yearly"
): number {
  return billingCycle === "monthly" ? monthlyPrice : yearlyPrice;
}

/**
 * 주문 ID 생성 헬퍼
 */
export function generateOrderId(userId: number, planId: number): string {
  const timestamp = Date.now();
  return `NICS_${userId}_${planId}_${timestamp}`;
}

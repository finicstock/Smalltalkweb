import Layout from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { useLocation } from "wouter";

const termsSections = [
  {
    title: "서비스 이용",
    body: "닉스의 스몰톡은 투자 인사이트와 교육 목적의 콘텐츠를 제공합니다. 모든 콘텐츠는 투자 판단을 돕기 위한 참고 자료이며, 특정 종목이나 금융상품의 매수와 매도를 권유하지 않습니다.",
  },
  {
    title: "구독 및 결제",
    body: "프리미엄 콘텐츠는 유료 구독자에게 제공됩니다. 구독, 결제, 환불, 취소 조건은 결제 화면과 서비스 내 안내에 따릅니다.",
  },
  {
    title: "콘텐츠 권리",
    body: "서비스에 게시된 글, 이미지, 영상, 자료의 저작권은 별도 표시가 없는 한 닉스의 스몰톡 또는 정당한 권리자에게 있습니다. 무단 복제, 배포, 2차 가공은 제한됩니다.",
  },
  {
    title: "면책",
    body: "투자 결과에 대한 최종 책임은 이용자 본인에게 있습니다. 시장 상황, 정책, 기업 실적 등은 변동될 수 있으며 서비스는 정보의 완전성이나 수익을 보장하지 않습니다.",
  },
];

const privacySections = [
  {
    title: "수집하는 정보",
    body: "서비스 이용을 위해 로그인 식별 정보, 이름, 이메일, 구독 상태, 결제 이력, 콘텐츠 이용 기록 등 운영에 필요한 최소한의 정보를 처리할 수 있습니다.",
  },
  {
    title: "정보 이용 목적",
    body: "수집한 정보는 회원 식별, 구독 권한 확인, 결제 처리, 고객 응대, 서비스 품질 개선, 부정 이용 방지를 위해 사용됩니다.",
  },
  {
    title: "보관 및 파기",
    body: "개인정보는 이용 목적 달성 후 관련 법령과 내부 정책에 따라 보관하거나 파기합니다. 결제 및 계약 관련 기록은 법령상 보관 기간을 따릅니다.",
  },
  {
    title: "외부 서비스",
    body: "로그인, 결제, 알림 등 일부 기능은 외부 서비스와 연동될 수 있습니다. 이 경우 필요한 범위에서만 정보가 전달됩니다.",
  },
];

export default function LegalPage() {
  const [location] = useLocation();
  const isPrivacy = location === "/privacy";
  const title = isPrivacy ? "개인정보처리방침" : "이용약관";
  const description = isPrivacy
    ? "닉스의 스몰톡이 개인정보를 어떻게 처리하는지 안내합니다."
    : "닉스의 스몰톡 서비스 이용 기준을 안내합니다.";
  const sections = isPrivacy ? privacySections : termsSections;

  return (
    <Layout>
      <section className="bg-gradient-to-b from-primary/5 to-background">
        <div className="container py-12 md:py-16">
          <p className="mb-2 text-sm font-medium text-primary">Legal</p>
          <h1 className="text-3xl font-bold text-foreground md:text-4xl">{title}</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">{description}</p>
        </div>
      </section>

      <section className="container max-w-3xl py-8 md:py-12">
        <Card>
          <CardContent className="space-y-7 p-6 md:p-8">
            <p className="text-sm text-muted-foreground">
              본 문서는 서비스 운영을 위한 기본 안내입니다. 결제 시스템 정식 오픈 전 최종 약관과 개인정보처리방침은 사업자 정보, 환불 정책, 외부 위탁사를 반영해 업데이트해야 합니다.
            </p>
            {sections.map((section) => (
              <section key={section.title} className="space-y-2">
                <h2 className="text-lg font-semibold text-foreground">{section.title}</h2>
                <p className="text-sm leading-7 text-muted-foreground">{section.body}</p>
              </section>
            ))}
            <p className="border-t border-border pt-5 text-xs text-muted-foreground">
              최종 업데이트: 2026년 5월 13일
            </p>
          </CardContent>
        </Card>
      </section>
    </Layout>
  );
}

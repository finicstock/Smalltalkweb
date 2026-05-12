import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { Check, Zap, Crown, Shield, BarChart3, Star } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const LOGO_URL = "/manus-storage/logo_nobg_4a51d334.png";

export default function Pricing() {
  const { user, isAuthenticated } = useAuth();
  const { data: subscription } = trpc.subscription.mySubscription.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
  });
  const [selectedCycle, setSelectedCycle] = useState<"monthly" | "yearly">("yearly");

  const isSubscribed = !!subscription;

  const handleSubscribe = () => {
    if (!isAuthenticated) {
      window.location.href = getLoginUrl();
      return;
    }
    if (isSubscribed) {
      toast.info("이미 구독 중입니다.");
      return;
    }
    // PG 연동 전: 안내 메시지
    toast.info("결제 시스템 준비 중입니다. 곧 서비스가 시작됩니다.");
  };

  return (
    <Layout>
      {/* Hero */}
      <section className="bg-gradient-to-b from-primary/5 via-background to-background py-16 md:py-24">
        <div className="container text-center">
          <div className="flex justify-center mb-6">
            <img src={LOGO_URL} alt="닉스의 스몰톡" className="h-20 w-auto" />
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
            프리미엄 구독
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            시장의 소음을 걷어내고, 진짜 중요한 투자 인사이트에 집중하세요.
            닉스의 스몰톡 프리미엄 구독으로 한 단계 높은 투자를 시작합니다.
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-background">
        <div className="container">
          <h2 className="text-2xl font-bold text-center text-foreground mb-10">구독자 혜택</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {[
              { icon: <BarChart3 className="h-6 w-6" />, title: "심층 분석 리포트", desc: "매주 발행되는 시장 심층 분석 리포트를 받아보세요." },
              { icon: <Crown className="h-6 w-6" />, title: "프리미엄 콘텐츠", desc: "유료 전용 아티클과 영상 콘텐츠를 무제한 열람하세요." },
              { icon: <Shield className="h-6 w-6" />, title: "텔레그램 커뮤니티", desc: "구독자 전용 텔레그램 채널에서 실시간 토론에 참여하세요." },
              { icon: <Star className="h-6 w-6" />, title: "독립적 시각", desc: "특정 종목 추천이 아닌, 객관적이고 독립적인 분석을 제공합니다." },
            ].map((item, i) => (
              <Card key={i} className="border-0 shadow-sm">
                <CardContent className="p-6 text-center space-y-3">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mx-auto">
                    {item.icon}
                  </div>
                  <h3 className="font-semibold text-card-foreground">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-16 bg-secondary/30">
        <div className="container">
          <h2 className="text-2xl font-bold text-center text-foreground mb-3">구독 플랜</h2>
          <p className="text-center text-muted-foreground mb-10">합리적인 가격으로 시작하세요</p>

          {/* Toggle */}
          <div className="flex justify-center mb-10">
            <div className="inline-flex items-center bg-muted rounded-lg p-1">
              <button
                className={`px-5 py-2 rounded-md text-sm font-medium transition-all ${selectedCycle === "monthly" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
                onClick={() => setSelectedCycle("monthly")}
              >
                월간
              </button>
              <button
                className={`px-5 py-2 rounded-md text-sm font-medium transition-all ${selectedCycle === "yearly" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
                onClick={() => setSelectedCycle("yearly")}
              >
                연간 <span className="text-primary text-xs ml-1">17% 할인</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {/* Free */}
            <Card className="border-2 border-border">
              <CardContent className="p-8 space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-card-foreground">무료</h3>
                  <p className="text-sm text-muted-foreground mt-1">기본 콘텐츠 열람</p>
                </div>
                <div>
                  <span className="text-4xl font-bold text-foreground">0</span>
                  <span className="text-muted-foreground ml-1">원</span>
                </div>
                <ul className="space-y-3">
                  {["무료 공개 콘텐츠 열람", "콘텐츠 검색"].map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                      <Check className="h-4 w-4 text-primary shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                <Button variant="outline" className="w-full" disabled={isAuthenticated}>
                  {isAuthenticated ? "현재 이용 중" : "무료로 시작"}
                </Button>
              </CardContent>
            </Card>

            {/* Premium */}
            <Card className="border-2 border-primary relative shadow-lg">
              {selectedCycle === "yearly" && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground px-4 py-1 text-xs font-medium gap-1">
                    <Zap className="h-3 w-3" /> 가장 인기
                  </Badge>
                </div>
              )}
              <CardContent className="p-8 space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-card-foreground flex items-center gap-2">
                    <Star className="h-5 w-5 text-primary" /> 프리미엄
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">모든 콘텐츠 무제한</p>
                </div>
                <div>
                  {selectedCycle === "monthly" ? (
                    <>
                      <span className="text-4xl font-bold text-foreground">29,900</span>
                      <span className="text-muted-foreground ml-1">원/월</span>
                    </>
                  ) : (
                    <>
                      <span className="text-4xl font-bold text-foreground">299,000</span>
                      <span className="text-muted-foreground ml-1">원/년</span>
                      <p className="text-sm text-primary font-medium mt-1">월 24,917원 (2개월 무료)</p>
                    </>
                  )}
                </div>
                <ul className="space-y-3">
                  {[
                    "모든 프리미엄 콘텐츠 무제한 열람",
                    "주간 심층 분석 리포트",
                    "텔레그램 커뮤니티 입장권",
                    selectedCycle === "yearly" ? "연간 구독자 전용 콘텐츠" : null,
                  ].filter(Boolean).map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                      <Check className="h-4 w-4 text-primary shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                <Button className="w-full" size="lg" onClick={handleSubscribe} disabled={isSubscribed}>
                  {isSubscribed ? "구독 중" : "구독하기"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 bg-background">
        <div className="container max-w-3xl">
          <h2 className="text-2xl font-bold text-center text-foreground mb-10">자주 묻는 질문</h2>
          <div className="space-y-6">
            {[
              { q: "구독은 언제든 취소할 수 있나요?", a: "네, 언제든지 취소 가능합니다. 취소 후에도 결제 기간이 끝날 때까지 콘텐츠를 이용하실 수 있습니다." },
              { q: "결제 수단은 무엇이 있나요?", a: "국내 신용카드, 체크카드, 카카오페이, 네이버페이 등 다양한 결제 수단을 지원합니다. (결제 시스템 준비 중)" },
              { q: "무료 콘텐츠도 있나요?", a: "네, 일부 콘텐츠는 무료로 공개됩니다. 프리미엄 구독 없이도 무료 콘텐츠를 자유롭게 열람하실 수 있습니다." },
              { q: "환불 정책은 어떻게 되나요?", a: "구독 시작 후 7일 이내에 콘텐츠를 열람하지 않은 경우 전액 환불이 가능합니다. 자세한 내용은 이용약관을 참고해 주세요." },
            ].map((item, i) => (
              <div key={i} className="space-y-2">
                <h3 className="font-semibold text-foreground">{item.q}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.a}</p>
                {i < 3 && <Separator className="mt-4" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 bg-primary/5">
        <div className="container text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
            지금 시작하세요
          </h2>
          <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
            더 나은 투자 의사결정을 위한 첫 걸음, 닉스의 스몰톡과 함께하세요.
          </p>
          <Button size="lg" className="gap-2" onClick={handleSubscribe}>
            <Crown className="h-4 w-4" /> 프리미엄 구독 시작
          </Button>
        </div>
      </section>
    </Layout>
  );
}

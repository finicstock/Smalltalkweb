import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, TrendingUp, Lock, Eye, Zap, BarChart3, Shield, Check } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

const LOGO_URL = "/manus-storage/logo_nobg_4a51d334.png";

function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 via-background to-background">
      <div className="container py-20 md:py-28">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <div className="flex justify-center mb-6">
            <img src={LOGO_URL} alt="닉스의 스몰톡" className="h-28 md:h-36 w-auto" />
          </div>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground leading-tight">
            투자의 본질을<br className="hidden sm:block" /> 이야기합니다
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            시장의 소음을 걷어내고, 진짜 중요한 것에 집중합니다.
            닉스의 스몰톡에서 깊이 있는 투자 인사이트를 만나보세요.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
            <Link href="/contents">
              <Button size="lg" className="gap-2 text-base px-8">
                콘텐츠 둘러보기
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/pricing">
              <Button size="lg" variant="outline" className="text-base px-8">
                구독 안내
              </Button>
            </Link>
          </div>
        </div>
      </div>
      {/* Decorative gradient */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl" />
      </div>
    </section>
  );
}

function ValuePropositionSection() {
  const values = [
    {
      icon: <BarChart3 className="h-6 w-6" />,
      title: "깊이 있는 분석",
      description: "표면적인 뉴스가 아닌, 시장의 구조와 맥락을 파악하는 심층 분석을 제공합니다.",
    },
    {
      icon: <TrendingUp className="h-6 w-6" />,
      title: "실전 투자 인사이트",
      description: "이론에 그치지 않고, 실제 투자 의사결정에 도움이 되는 실전 정보를 전달합니다.",
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: "독립적 시각",
      description: "특정 종목이나 상품 추천이 아닌, 독립적이고 객관적인 시각을 유지합니다.",
    },
  ];

  return (
    <section className="py-20 bg-background">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">왜 닉스의 스몰톡인가요?</h2>
          <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
            투자에 대한 새로운 관점을 제시합니다
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {values.map((item, i) => (
            <Card key={i} className="border-0 shadow-sm bg-card hover:shadow-md transition-shadow">
              <CardContent className="p-6 space-y-4">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  {item.icon}
                </div>
                <h3 className="text-lg font-semibold text-card-foreground">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function RecentContentPreview() {
  const { data: contents, isLoading } = trpc.content.listPublished.useQuery(
    { limit: 3 },
    { retry: false }
  );

  if (isLoading) {
    return (
      <section className="py-20 bg-secondary/30">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground">최근 콘텐츠</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="overflow-hidden animate-pulse">
                <div className="h-48 bg-muted" />
                <CardContent className="p-5 space-y-3">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-full" />
                  <div className="h-3 bg-muted rounded w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    );
  }

  const items = contents ?? [];

  return (
    <section className="py-20 bg-secondary/30">
      <div className="container">
        <div className="flex items-center justify-between mb-12">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground">최근 콘텐츠</h2>
            <p className="text-muted-foreground mt-2">최신 투자 인사이트를 확인하세요</p>
          </div>
          <Link href="/contents">
            <Button variant="ghost" className="gap-1 text-primary">
              전체보기 <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {items.length > 0 ? items.map((item) => (
            <Link key={item.id} href={`/contents/${item.slug}`}>
              <Card className="overflow-hidden group hover:shadow-lg transition-all duration-300 cursor-pointer h-full">
                <div className="relative h-48 bg-muted overflow-hidden">
                  {item.thumbnailUrl ? (
                    <img
                      src={item.thumbnailUrl}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-primary/5">
                      <TrendingUp className="h-12 w-12 text-primary/30" />
                    </div>
                  )}
                  <div className="absolute top-3 left-3 flex gap-2">
                    {item.accessLevel === "paid" && (
                      <Badge variant="secondary" className="bg-primary text-primary-foreground text-xs gap-1">
                        <Lock className="h-3 w-3" /> 유료
                      </Badge>
                    )}
                    {item.contentType === "video" && (
                      <Badge variant="secondary" className="text-xs">영상</Badge>
                    )}
                  </div>
                </div>
                <CardContent className="p-5 space-y-2">
                  <h3 className="font-semibold text-card-foreground line-clamp-2 group-hover:text-primary transition-colors">
                    {item.title}
                  </h3>
                  {item.excerpt && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{item.excerpt}</p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
                    <span className="flex items-center gap-1">
                      <Eye className="h-3 w-3" /> {item.viewCount}
                    </span>
                    {item.publishedAt && (
                      <span>{new Date(item.publishedAt).toLocaleDateString("ko-KR")}</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          )) : (
            [1, 2, 3].map((i) => (
              <Card key={i} className="overflow-hidden">
                <div className="h-48 bg-muted flex items-center justify-center">
                  <TrendingUp className="h-12 w-12 text-muted-foreground/20" />
                </div>
                <CardContent className="p-5 space-y-2">
                  <h3 className="font-semibold text-muted-foreground">콘텐츠 준비 중</h3>
                  <p className="text-sm text-muted-foreground/60">곧 새로운 콘텐츠가 올라옵니다.</p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

function PricingPreviewSection() {
  return (
    <section className="py-20 bg-background">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">구독 플랜</h2>
          <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
            합리적인 가격으로 프리미엄 투자 인사이트를 만나보세요
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* Monthly */}
          <Card className="border-2 border-border hover:border-primary/30 transition-colors">
            <CardContent className="p-8 text-center space-y-5">
              <div>
                <h3 className="text-lg font-semibold text-card-foreground">월간 구독</h3>
                <p className="text-sm text-muted-foreground mt-1">부담 없이 시작하기</p>
              </div>
              <div>
                <span className="text-4xl font-bold text-foreground">29,900</span>
                <span className="text-muted-foreground ml-1">원/월</span>
              </div>
              <ul className="space-y-2.5 text-sm text-left">
                {["모든 프리미엄 콘텐츠 열람", "주간 투자 리포트", "이메일 뉴스레터", "채팅 고객센터"].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-muted-foreground">
                    <Check className="h-4 w-4 text-primary shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              <Link href="/pricing">
                <Button variant="outline" className="w-full">구독하기</Button>
              </Link>
            </CardContent>
          </Card>

          {/* Yearly */}
          <Card className="border-2 border-primary relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <Badge className="bg-primary text-primary-foreground px-3 py-1 text-xs font-medium">
                <Zap className="h-3 w-3 mr-1" /> 2개월 무료
              </Badge>
            </div>
            <CardContent className="p-8 text-center space-y-5">
              <div>
                <h3 className="text-lg font-semibold text-card-foreground">연간 구독</h3>
                <p className="text-sm text-muted-foreground mt-1">가장 합리적인 선택</p>
              </div>
              <div>
                <span className="text-4xl font-bold text-foreground">299,000</span>
                <span className="text-muted-foreground ml-1">원/년</span>
              </div>
              <p className="text-xs text-primary font-medium">월 24,917원 (17% 할인)</p>
              <ul className="space-y-2.5 text-sm text-left">
                {["모든 프리미엄 콘텐츠 열람", "주간 투자 리포트", "이메일 뉴스레터", "채팅 고객센터", "연간 구독자 전용 콘텐츠"].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-muted-foreground">
                    <Check className="h-4 w-4 text-primary shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              <Link href="/pricing">
                <Button className="w-full">구독하기</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}

function NewsletterCTA() {
  return (
    <section className="py-16 bg-primary/5">
      <div className="container">
        <div className="max-w-2xl mx-auto text-center space-y-4">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">뉴스레터 구독</h2>
          <p className="text-muted-foreground">
            매주 엄선된 투자 인사이트를 이메일로 받아보세요. 무료입니다.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto pt-2">
            <input
              type="email"
              placeholder="이메일 주소를 입력하세요"
              className="flex-1 px-4 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <Button className="shrink-0">구독하기</Button>
          </div>
          <p className="text-xs text-muted-foreground">언제든지 구독을 취소할 수 있습니다.</p>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <Layout>
      <HeroSection />
      <ValuePropositionSection />
      <RecentContentPreview />
      <PricingPreviewSection />
      <NewsletterCTA />
    </Layout>
  );
}

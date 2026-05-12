import { useEffect } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, TrendingUp, Lock, Eye, Zap, BarChart3, Shield, Check, Send, BookOpen, Clock, Flame, Layers, PlayCircle } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import BrandLogo from "@/components/BrandLogo";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";
import { estimateReadingMinutes, formatContentDate, getAccessLabel, getContentTypeLabel } from "@/lib/contentUtils";

function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 via-background to-background">
      <div className="container py-12 md:py-28">
        <div className="mx-auto max-w-3xl text-center space-y-4 md:space-y-6">
          <div className="flex justify-center mb-4 md:mb-6">
            <BrandLogo
              className="flex-col gap-3"
              imageClassName="h-20 md:h-36 w-auto"
              markClassName="h-16 w-16 text-2xl md:h-24 md:w-24 md:text-4xl"
              textClassName="text-xl md:text-3xl"
            />
          </div>
          <h1 className="relative left-1/2 w-screen -translate-x-1/2 px-2 text-[18px] font-bold tracking-tight text-foreground leading-tight max-[359px]:text-base sm:static sm:w-auto sm:translate-x-0 sm:px-0 sm:text-3xl md:text-5xl">
            <span className="block whitespace-nowrap">
              투자대회 1위 출신 닉스가 말하는
            </span>
            <span className="mt-1 block whitespace-nowrap">
              투자에 대한 작은 이야기, 지금 함께하세요.
            </span>
          </h1>
          <p className="text-sm sm:text-base md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
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
    <section className="py-10 md:py-20 bg-background">
      <div className="container">
        <div className="text-center mb-6 md:mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">왜 닉스의 스몰톡인가요?</h2>
          <p className="hidden sm:block text-muted-foreground mt-3 max-w-xl mx-auto">
            투자에 대한 새로운 관점을 제시합니다
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 md:gap-6">
          {values.map((item, i) => (
            <Card key={i} className="border-0 shadow-sm bg-card hover:shadow-md transition-shadow">
              <CardContent className="p-3 text-center space-y-2 md:p-8 md:space-y-4">
                <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary mx-auto md:h-14 md:w-14 md:rounded-2xl [&>svg]:h-4 [&>svg]:w-4 md:[&>svg]:h-6 md:[&>svg]:w-6">
                  {item.icon}
                </div>
                <h3 className="text-[13px] font-semibold leading-snug text-card-foreground md:text-lg">{item.title}</h3>
                <p className="hidden sm:block text-sm text-muted-foreground leading-relaxed">{item.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function StartHereSection() {
  const steps = [
    {
      label: "처음 오셨다면",
      title: "필독 콘텐츠부터 읽기",
      description: "채널의 관점, 읽는 순서, 투자 글을 활용하는 방법을 먼저 확인하세요.",
      href: "/contents?q=필독",
      icon: <BookOpen className="h-5 w-5" />,
    },
    {
      label: "흐름 잡기",
      title: "최신 시장 글 보기",
      description: "가장 최근 발행된 시황과 투자 아이디어를 빠르게 따라잡습니다.",
      href: "/contents",
      icon: <TrendingUp className="h-5 w-5" />,
    },
    {
      label: "더 깊게 보기",
      title: "프리미엄 구독 확인",
      description: "유료 콘텐츠와 텔레그램 채널까지 이어지는 전체 이용 흐름을 확인하세요.",
      href: "/pricing",
      icon: <CrownIcon />,
    },
  ];

  return (
    <section className="py-10 md:py-16 bg-muted/30">
      <div className="container">
        <div className="mb-6 flex flex-col gap-2 md:mb-8 md:flex-row md:items-end md:justify-between">
          <div>
            <Badge variant="secondary" className="mb-3">START</Badge>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground">처음 오신 분은 이 순서로 보세요</h2>
          </div>
          <p className="max-w-xl text-sm text-muted-foreground md:text-right">
            네이버 프리미엄콘텐츠처럼 첫 방문자가 바로 길을 찾도록, 핵심 진입 경로를 먼저 열어둡니다.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-5">
          {steps.map((step, index) => (
            <Link key={step.title} href={step.href}>
              <Card className="h-full border-border/70 bg-card transition-all hover:-translate-y-0.5 hover:shadow-md">
                <CardContent className="flex h-full gap-4 p-5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    {step.icon}
                  </div>
                  <div className="min-w-0 space-y-1">
                    <p className="text-xs font-medium text-primary">{index + 1}. {step.label}</p>
                    <h3 className="font-semibold text-card-foreground">{step.title}</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">{step.description}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function CrownIcon() {
  return <Zap className="h-5 w-5" />;
}

function MiniContentCard({ item, rank }: { item: any; rank?: number }) {
  const readingMinutes = estimateReadingMinutes(item.body ?? item.excerpt);

  return (
    <Link href={`/contents/${item.slug}`}>
      <Card className="group h-full overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-md">
        <div className="relative flex h-44 items-center justify-center overflow-hidden bg-gradient-to-br from-primary/10 to-primary/5">
          {item.thumbnailUrl ? (
            <img src={item.thumbnailUrl} alt={item.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
          ) : item.contentType === "video" ? (
            <PlayCircle className="h-12 w-12 text-primary/30" />
          ) : (
            <TrendingUp className="h-12 w-12 text-primary/30" />
          )}
          <div className="absolute left-3 top-3 flex gap-2">
            {rank ? (
              <Badge className="bg-foreground text-background">TOP {rank}</Badge>
            ) : null}
            <Badge variant={item.accessLevel === "paid" ? "default" : "secondary"} className="gap-1 text-xs">
              {item.accessLevel === "paid" && <Lock className="h-3 w-3" />}
              {getAccessLabel(item.accessLevel)}
            </Badge>
          </div>
        </div>
        <CardContent className="space-y-3 p-5">
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="outline" className="text-[11px]">{getContentTypeLabel(item.contentType)}</Badge>
            <Badge variant="outline" className="gap-1 text-[11px]">
              <Clock className="h-3 w-3" /> 완독 {readingMinutes}분
            </Badge>
          </div>
          <h3 className="line-clamp-2 font-semibold text-card-foreground transition-colors group-hover:text-primary">{item.title}</h3>
          {item.excerpt && <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">{item.excerpt}</p>}
          <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {(item.viewCount ?? 0).toLocaleString()}</span>
            {item.publishedAt && <span>{formatContentDate(item.publishedAt)}</span>}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function PlaylistShowcaseSection() {
  const { data: playlists } = trpc.playlist.listPublic.useQuery();
  const fallbackPlaylists = [
    { id: "starter", title: "처음 읽는 투자 흐름", slug: "starter", description: "입문자에게 필요한 기본 관점과 시장 읽는 순서를 정리합니다.", thumbnailUrl: null },
    { id: "market", title: "주간 시장 리뷰", slug: "market", description: "매주 시장의 핵심 변수와 다음 체크포인트를 이어서 봅니다.", thumbnailUrl: null },
    { id: "premium", title: "프리미엄 리포트", slug: "premium", description: "구독자 전용으로 더 깊게 다루는 분석 글을 모아 봅니다.", thumbnailUrl: null },
  ];
  const showcaseItems = playlists && playlists.length > 0 ? playlists.slice(0, 3) : fallbackPlaylists;

  return (
    <section className="py-12 md:py-20 bg-background">
      <div className="container">
        <div className="mb-6 flex items-center justify-between md:mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground">시리즈로 이어보기</h2>
            <p className="mt-2 text-sm text-muted-foreground">흩어진 글을 주제별 흐름으로 묶어 더 빠르게 따라올 수 있게 했습니다.</p>
          </div>
          <Link href="/contents">
            <Button variant="ghost" className="hidden gap-1 text-muted-foreground hover:text-foreground sm:flex">
              전체보기 <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {showcaseItems.map((playlist) => (
            <Link key={playlist.id} href={typeof playlist.id === "number" ? `/playlists/${playlist.slug}` : "/contents"}>
              <Card className="group h-full overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex h-32 items-center justify-center bg-gradient-to-br from-primary/10 via-background to-muted">
                  {playlist.thumbnailUrl ? (
                    <img src={playlist.thumbnailUrl} alt={playlist.title} className="h-full w-full object-cover" />
                  ) : (
                    <Layers className="h-10 w-10 text-primary/35" />
                  )}
                </div>
                <CardContent className="space-y-2 p-5">
                  <Badge variant="secondary" className="text-[11px]">재생목록</Badge>
                  <h3 className="font-semibold text-card-foreground transition-colors group-hover:text-primary">{playlist.title}</h3>
                  {playlist.description && <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">{playlist.description}</p>}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function PopularContentSection() {
  const { data: popularContents } = trpc.content.listPopular.useQuery({ limit: 5 });
  if (!popularContents || popularContents.length === 0) return null;

  return (
    <section className="py-12 md:py-20 bg-muted/30">
      <div className="container">
        <div className="mb-6 flex flex-col gap-2 md:mb-8 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-primary">
              <Flame className="h-4 w-4" /> 많이 본 콘텐츠
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground">지금 독자가 많이 읽는 글</h2>
          </div>
          <p className="text-sm text-muted-foreground">조회수 기준으로 정렬해 첫 방문자가 검증된 글부터 볼 수 있게 합니다.</p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
          {popularContents.map((item, index) => (
            <Link key={item.id} href={`/contents/${item.slug}`}>
              <Card className="group h-full transition-all hover:-translate-y-0.5 hover:shadow-md">
                <CardContent className="flex h-full flex-col gap-3 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-bold text-primary">{index + 1}</span>
                    <Badge variant={item.accessLevel === "paid" ? "default" : "secondary"} className="text-[11px]">
                      {getAccessLabel(item.accessLevel)}
                    </Badge>
                  </div>
                  <h3 className="line-clamp-3 text-sm font-semibold leading-relaxed text-card-foreground group-hover:text-primary">{item.title}</h3>
                  <div className="mt-auto flex items-center justify-between text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {(item.viewCount ?? 0).toLocaleString()}</span>
                    <span>완독 {estimateReadingMinutes(item.body ?? item.excerpt)}분</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function RecentContentPreview() {
  const { data: contents, isLoading } = trpc.content.listPublished.useQuery({ limit: 3 });

  return (
    <section className="py-12 md:py-20 bg-muted/30">
      <div className="container">
        <div className="flex items-center justify-between mb-8 md:mb-10">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">최근 콘텐츠</h2>
          <Link href="/contents">
            <Button variant="ghost" className="gap-1 text-muted-foreground hover:text-foreground">
              전체보기 <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {!isLoading && contents && contents.length > 0 ? contents.map((item) => (
            <MiniContentCard key={item.id} item={item} />
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
  const { isAuthenticated } = useAuth();
  const { data: subscription } = trpc.subscription.mySubscription.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
  });
  const isSubscribed = !!subscription;

  const handleSubscribe = (cycle: "monthly" | "yearly") => {
    if (!isAuthenticated) {
      window.location.href = getLoginUrl();
      return;
    }
    if (isSubscribed) {
      toast.info("이미 구독 중입니다.");
      return;
    }
    toast.info(`${cycle === "monthly" ? "월간" : "연간"} 구독 결제 시스템 준비 중입니다. 곧 서비스가 시작됩니다.`);
  };

  return (
    <section className="py-12 md:py-20 bg-background">
      <div className="container">
        <div className="text-center mb-8 md:mb-12">
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
                {["모든 프리미엄 콘텐츠 열람", "주간 투자 리포트", "텔레그램 프리미엄 채널 입장"].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-muted-foreground">
                    <Check className="h-4 w-4 text-primary shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              <Button variant="outline" className="w-full" onClick={() => handleSubscribe("monthly")} disabled={isSubscribed}>
                {isSubscribed ? "구독 중" : "구독하기"}
              </Button>
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
                {["모든 프리미엄 콘텐츠 열람", "주간 투자 리포트", "텔레그램 프리미엄 채널 입장", "연간 구독자 전용 콘텐츠"].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-muted-foreground">
                    <Check className="h-4 w-4 text-primary shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              <Button className="w-full" onClick={() => handleSubscribe("yearly")} disabled={isSubscribed}>
                {isSubscribed ? "구독 중" : "구독하기"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}

function TelegramCTA() {
  return (
    <section className="py-12 md:py-16 bg-[#0088cc]/5">
      <div className="container">
        <div className="max-w-2xl mx-auto text-center space-y-4">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-full bg-[#0088cc]/10 flex items-center justify-center">
              <Send className="h-8 w-8 text-[#0088cc]" />
            </div>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">텔레그램 프리미엄 채널</h2>
          <p className="text-muted-foreground">
            구독자 전용 텔레그램 채널에서 실시간 투자 인사이트와 토론에 참여하세요.
          </p>
          <Link href="/pricing">
            <Button className="gap-2 bg-[#0088cc] hover:bg-[#006699] text-white">
              <Send className="h-4 w-4" /> 구독하고 입장하기
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  useEffect(() => {
    document.title = "닉스의 스몰톡 | 투자 대회 1위 출신 닉스의 투자 인사이트";
  }, []);

  return (
    <Layout>
      <HeroSection />
      <ValuePropositionSection />
      <StartHereSection />
      <PlaylistShowcaseSection />
      <PopularContentSection />
      <RecentContentPreview />
      <PricingPreviewSection />
      <TelegramCTA />
    </Layout>
  );
}

import { useEffect, useRef, useState, useMemo } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useParams, Link } from "wouter";
import { Lock, Eye, Calendar, ArrowLeft, PlayCircle, Crown, List, Sun, Moon, Share2, Copy, Check, Clock, MessageCircle, ArrowRight } from "lucide-react";
import { getLoginUrl } from "@/const";
import { Streamdown } from "streamdown";
import { useTheme } from "@/contexts/ThemeContext";
import { toast } from "sonner";
import { sanitizeHtml } from "@/lib/sanitizeHtml";
import { estimateReadingMinutes, formatLongContentDate, getAccessLabel, getContentTypeLabel } from "@/lib/contentUtils";

// ─── 목차 항목 타입 ─────────────────────────────────────────────
interface TocItem {
  id: string;
  text: string;
  level: number;
}

type ArticleFontSize = "comfortable" | "large" | "xlarge";

// ─── HTML에서 목차 추출 ──────────────────────────────────────────
function extractToc(html: string): TocItem[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const headings = doc.querySelectorAll("h1, h2, h3");
  const items: TocItem[] = [];
  headings.forEach((el, idx) => {
    const text = el.textContent?.trim() ?? "";
    if (!text) return;
    const id = `heading-${idx}`;
    el.id = id;
    items.push({ id, text, level: parseInt(el.tagName[1]) });
  });
  return items;
}

// ─── 본문 HTML에 heading id 주입 ────────────────────────────────
function injectHeadingIds(html: string): string {
  let idx = 0;
  return html.replace(/<(h[1-3])([^>]*)>/gi, (_match, tag, attrs) => {
    const id = `heading-${idx++}`;
    return `<${tag}${attrs} id="${id}">`;
  });
}

// ─── SNS 공유 버튼 컴포넌트 ─────────────────────────────────────
function ShareButtons({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);
  const url = window.location.href;

  const shareKakao = () => {
    const kakaoUrl = `https://story.kakao.com/share?url=${encodeURIComponent(url)}`;
    window.open(kakaoUrl, "_blank", "width=600,height=400");
  };

  const shareTwitter = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`;
    window.open(twitterUrl, "_blank", "width=600,height=400");
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("링크가 복사되었습니다!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("링크 복사에 실패했습니다.");
    }
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-[12px] text-muted-foreground flex items-center gap-1">
        <Share2 className="h-3.5 w-3.5" /> 공유
      </span>
      <button
        onClick={shareKakao}
        className="h-8 w-8 rounded-full bg-[#FEE500] flex items-center justify-center hover:opacity-80 transition-opacity"
        title="카카오스토리 공유"
      >
        <span className="text-[11px] font-bold text-[#3A1D1D]">K</span>
      </button>
      <button
        onClick={shareTwitter}
        className="h-8 w-8 rounded-full bg-black flex items-center justify-center hover:opacity-80 transition-opacity"
        title="X(트위터) 공유"
      >
        <span className="text-[11px] font-bold text-white">X</span>
      </button>
      <button
        onClick={copyLink}
        className="h-8 w-8 rounded-full bg-muted flex items-center justify-center hover:opacity-80 transition-opacity"
        title="링크 복사"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
      </button>
    </div>
  );
}

// ─── 목차 사이드바 ───────────────────────────────────────────────
function TableOfContents({ items, activeId }: { items: TocItem[]; activeId: string }) {
  if (items.length === 0) return null;
  return (
    <nav className="hidden xl:block fixed top-24 right-6 w-56 max-h-[70vh] overflow-y-auto">
      <div className="bg-card border border-border rounded-lg p-3">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
          <List className="h-3 w-3" /> 목차
        </p>
        <ul className="space-y-1">
          {items.map((item) => (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                className={`block text-[12px] leading-snug py-0.5 transition-colors hover:text-primary
                  ${item.level === 1 ? "pl-0 font-medium" : item.level === 2 ? "pl-3" : "pl-6 text-muted-foreground"}
                  ${activeId === item.id ? "text-primary font-medium" : "text-muted-foreground"}
                `}
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById(item.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
              >
                {item.text}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}

function FontSizeControls({ value, onChange }: { value: ArticleFontSize; onChange: (value: ArticleFontSize) => void }) {
  const options: Array<{ value: ArticleFontSize; label: string; className: string }> = [
    { value: "comfortable", label: "가", className: "text-xs" },
    { value: "large", label: "가", className: "text-sm" },
    { value: "xlarge", label: "가", className: "text-base" },
  ];

  return (
    <div className="hidden items-center gap-1 rounded-full border border-border bg-background p-1 sm:flex" aria-label="글씨 크기 조정">
      <span className="px-2 text-[11px] text-muted-foreground">글씨</span>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`flex h-7 w-7 items-center justify-center rounded-full font-semibold transition-colors ${option.className} ${
            value === option.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
          title={`본문 글씨 크기 ${option.value === "comfortable" ? "기본" : option.value === "large" ? "크게" : "더 크게"}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function SubscribeAfterRead({ popularContents }: { popularContents?: any[] }) {
  const previewItems = popularContents?.slice(0, 3) ?? [];

  return (
    <Card className="mt-12 border-primary/20 bg-primary/5">
      <CardContent className="grid gap-6 p-6 md:grid-cols-[1.2fr_0.8fr] md:p-8">
        <div className="space-y-4">
          <Badge className="gap-1 bg-primary text-primary-foreground">
            <Crown className="h-3.5 w-3.5" /> 프리미엄 구독
          </Badge>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">콘텐츠가 마음에 드셨나요?</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              구독하면 프리미엄 글, 주간 투자 리포트, 텔레그램 채널까지 이어서 이용할 수 있습니다.
            </p>
          </div>
          <Link href="/pricing">
            <Button className="gap-2">
              구독 혜택 보기 <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
        {previewItems.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-foreground">많이 읽는 글</p>
            <div className="space-y-2">
              {previewItems.map((item, index) => (
                <Link key={item.id} href={`/contents/${item.slug}`}>
                  <div className="rounded-lg border border-border bg-background/80 p-3 transition-colors hover:border-primary/40">
                    <div className="flex gap-3">
                      <span className="text-sm font-bold text-primary">{index + 1}</span>
                      <div className="min-w-0">
                        <p className="line-clamp-2 text-sm font-medium text-foreground">{item.title}</p>
                        <p className="mt-1 text-[11px] text-muted-foreground">조회 {(item.viewCount ?? 0).toLocaleString()} · 완독 {estimateReadingMinutes(item.body ?? item.excerpt)}분</p>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CommentPolicyBox() {
  return (
    <Card className="mt-6 border-dashed bg-muted/30">
      <CardContent className="flex gap-3 p-4">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-background text-muted-foreground">
          <MessageCircle className="h-4 w-4" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">댓글 기능 안내</p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            투자 콘텐츠의 성격상 개별 종목 상담이나 양방향 투자 권유로 오해될 수 있는 댓글 기능은 운영하지 않습니다.
            문의와 구독 관련 안내는 별도 고객 응대 채널로 받을 수 있도록 정리할 예정입니다.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ContentDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { user, isAuthenticated } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const bodyRef = useRef<HTMLDivElement>(null);
  const [activeHeadingId, setActiveHeadingId] = useState("");
  const [readingProgress, setReadingProgress] = useState(0);
  const [fontSize, setFontSize] = useState<ArticleFontSize>("comfortable");

  const { data: content, isLoading } = trpc.content.getBySlug.useQuery(
    { slug: slug ?? "" },
    { enabled: !!slug }
  );

  const { data: subscription } = trpc.subscription.mySubscription.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
  });
  const { data: popularContents } = trpc.content.listPopular.useQuery({ limit: 4 });

  // 조회수 기록
  const recordView = trpc.stats.recordView.useMutation();
  useEffect(() => {
    if (content?.id) {
      recordView.mutate({ contentId: content.id });
    }
  }, [content?.id]);

  const hasAccess = content?.accessLevel === "free" || !!subscription;
  const isPremiumLocked = content?.accessLevel === "paid" && !hasAccess;
  const readingMinutes = useMemo(() => estimateReadingMinutes(content?.body ?? content?.excerpt), [content?.body, content?.excerpt]);
  const articleFontClass = {
    comfortable: "prose-lg",
    large: "prose-xl",
    xlarge: "prose-2xl",
  }[fontSize];

  // 목차 추출
  const { toc, processedBody } = useMemo(() => {
    if (!content?.body?.trim().startsWith("<")) return { toc: [], processedBody: content?.body ?? "" };
    const safeBody = sanitizeHtml(content.body);
    const items = extractToc(safeBody);
    const injected = injectHeadingIds(safeBody);
    return { toc: items, processedBody: injected };
  }, [content?.body]);

  const paywallPreviewHtml = useMemo(() => {
    if (!content?.body?.trim().startsWith("<")) return "";
    return sanitizeHtml(content.body.slice(0, 500) + "...");
  }, [content?.body]);

  // 스크롤 감지로 활성 heading 추적
  useEffect(() => {
    if (toc.length === 0) return;
    const handler = () => {
      const headings = toc.map((item) => document.getElementById(item.id)).filter(Boolean) as HTMLElement[];
      let current = "";
      for (const el of headings) {
        if (el.getBoundingClientRect().top <= 120) current = el.id;
      }
      setActiveHeadingId(current);
    };
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, [toc]);

  useEffect(() => {
    if (!hasAccess) {
      setReadingProgress(0);
      return;
    }
    const handler = () => {
      const total = document.documentElement.scrollHeight - window.innerHeight;
      const progress = total > 0 ? Math.min(100, Math.max(0, (window.scrollY / total) * 100)) : 0;
      setReadingProgress(progress);
    };
    handler();
    window.addEventListener("scroll", handler, { passive: true });
    window.addEventListener("resize", handler);
    return () => {
      window.removeEventListener("scroll", handler);
      window.removeEventListener("resize", handler);
    };
  }, [hasAccess, content?.id]);

  if (isLoading) {
    return (
      <Layout>
        <div className="container py-10 max-w-4xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded w-1/2" />
            <div className="h-64 bg-muted rounded" />
            <div className="space-y-3">
              <div className="h-4 bg-muted rounded" />
              <div className="h-4 bg-muted rounded w-5/6" />
              <div className="h-4 bg-muted rounded w-4/6" />
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!content) {
    return (
      <Layout>
        <div className="container py-20 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">콘텐츠를 찾을 수 없습니다</h1>
          <Link href="/contents">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" /> 콘텐츠 목록으로
            </Button>
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {hasAccess && (
        <div className="fixed left-0 right-0 top-16 z-40 h-1 bg-transparent">
          <div
            className="h-full bg-primary transition-[width] duration-150"
            style={{ width: `${readingProgress}%` }}
            aria-hidden="true"
          />
        </div>
      )}

      {/* 목차 사이드바 */}
      {hasAccess && <TableOfContents items={toc} activeId={activeHeadingId} />}

      <article className="container py-8 max-w-4xl mx-auto">
        {/* Back + 다크모드 토글 */}
        <div className="flex items-center justify-between mb-6">
          <Link href="/contents">
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" /> 목록으로
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            {hasAccess && <FontSizeControls value={fontSize} onChange={setFontSize} />}
            <button
              onClick={toggleTheme}
              className="h-8 w-8 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors"
              title={theme === "dark" ? "라이트 모드로 전환" : "다크 모드로 전환"}
            >
              {theme === "dark" ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-muted-foreground" />}
            </button>
          </div>
        </div>

        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            {content.accessLevel === "paid" && (
              <Badge variant="secondary" className="bg-primary text-primary-foreground text-xs gap-1">
                <Lock className="h-3 w-3" /> {getAccessLabel(content.accessLevel)}
              </Badge>
            )}
            {content.accessLevel === "free" && (
              <Badge variant="secondary" className="text-xs">{getAccessLabel(content.accessLevel)}</Badge>
            )}
            {content.contentType === "video" && (
              <Badge variant="secondary" className="text-xs gap-1">
                <PlayCircle className="h-3 w-3" /> {getContentTypeLabel(content.contentType)}
              </Badge>
            )}
            {content.contentType === "article" && (
              <Badge variant="outline" className="text-xs">{getContentTypeLabel(content.contentType)}</Badge>
            )}
            <Badge variant="outline" className="gap-1 text-xs">
              <Clock className="h-3 w-3" /> 완독 {readingMinutes}분
            </Badge>
          </div>
          <h1 className="text-2xl md:text-4xl font-bold text-foreground leading-tight mb-4">
            {content.title}
          </h1>
          {content.excerpt && (
            <p className="text-lg text-muted-foreground leading-relaxed">{content.excerpt}</p>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              {content.publishedAt && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  {formatLongContentDate(content.publishedAt)}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Eye className="h-4 w-4" /> 조회 {content.viewCount}
              </span>
            </div>
            <ShareButtons title={content.title} />
          </div>
        </header>

        <Separator className="mb-8" />

        {/* Thumbnail */}
        {content.thumbnailUrl && (
          <div className="mb-8 rounded-xl overflow-hidden">
            <img
              src={content.thumbnailUrl}
              alt={content.title}
              className="w-full h-auto max-h-[500px] object-cover"
            />
          </div>
        )}

        {/* Video */}
        {content.contentType === "video" && content.videoUrl && hasAccess && (
          <div className="mb-8 rounded-xl overflow-hidden bg-black aspect-video">
            <iframe
              src={content.videoUrl}
              className="w-full h-full"
              allowFullScreen
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            />
          </div>
        )}

        {/* 모바일 목차 (접이식) */}
        {hasAccess && toc.length > 0 && (
          <MobileToc items={toc} />
        )}

        {/* Body or Paywall */}
        {hasAccess ? (
          <div
            ref={bodyRef}
            className={`prose ${articleFontClass} max-w-none text-foreground
              prose-headings:text-foreground prose-p:text-foreground/90
              prose-a:text-primary prose-strong:text-foreground
              prose-blockquote:border-primary/30 prose-blockquote:text-muted-foreground
              prose-code:text-primary prose-code:bg-primary/5 prose-code:rounded prose-code:px-1
              content-body
            `}
          >
            {content.body?.trim().startsWith('<') ? (
              <div dangerouslySetInnerHTML={{ __html: processedBody }} />
            ) : (
              <Streamdown>{content.body ?? ""}</Streamdown>
            )}
          </div>
        ) : (
          <div className="relative">
            {/* Blurred preview */}
            {content.body && (
              <div className="max-h-48 overflow-hidden relative">
                <div className="prose prose-lg max-w-none text-foreground opacity-50 blur-[2px]">
                  {content.body?.trim().startsWith('<') ? (
                    <div dangerouslySetInnerHTML={{ __html: paywallPreviewHtml }} />
                  ) : (
                    <Streamdown>{content.body.slice(0, 300) + "..."}</Streamdown>
                  )}
                </div>
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background" />
              </div>
            )}

            {/* Paywall */}
            <Card className="border-2 border-primary/20 mt-4">
              <CardContent className="p-8 text-center space-y-4">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <Crown className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-foreground">프리미엄 콘텐츠입니다</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  이 콘텐츠는 유료 구독자만 열람할 수 있습니다.
                  구독하시면 모든 프리미엄 콘텐츠를 무제한으로 이용하실 수 있습니다.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                  <Link href="/pricing">
                    <Button size="lg" className="gap-2">
                      <Crown className="h-4 w-4" /> 구독하기
                    </Button>
                  </Link>
                  {!isAuthenticated && (
                    <Button size="lg" variant="outline" onClick={() => { window.location.href = getLoginUrl(); }}>
                      로그인
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {hasAccess && !subscription && (
          <SubscribeAfterRead popularContents={popularContents?.filter((item) => item.slug !== content.slug)} />
        )}

        <CommentPolicyBox />

        {/* 하단 공유 버튼 */}
        <div className="mt-12 pt-8 border-t border-border flex items-center justify-between">
          <Link href="/contents">
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
              <ArrowLeft className="h-4 w-4" /> 목록으로
            </Button>
          </Link>
          <ShareButtons title={content.title} />
        </div>
      </article>

      {isPremiumLocked && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 px-4 py-3 shadow-[0_-10px_30px_rgba(15,23,42,0.12)] backdrop-blur md:hidden">
          <div className="mx-auto flex max-w-4xl items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">프리미엄 콘텐츠</p>
              <p className="truncate text-xs text-muted-foreground">구독하고 전체 내용을 이어서 읽으세요.</p>
            </div>
            <Link href="/pricing">
              <Button size="sm" className="gap-1.5">
                <Crown className="h-3.5 w-3.5" /> 구독하기
              </Button>
            </Link>
          </div>
        </div>
      )}
    </Layout>
  );
}

// ─── 모바일 목차 (접이식) ────────────────────────────────────────
function MobileToc({ items }: { items: TocItem[] }) {
  const [open, setOpen] = useState(false);
  if (items.length === 0) return null;
  return (
    <div className="xl:hidden mb-6 border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/50 text-[13px] font-medium text-foreground"
      >
        <span className="flex items-center gap-1.5">
          <List className="h-4 w-4" /> 목차
        </span>
        <span className="text-muted-foreground text-[11px]">{open ? "접기" : "펼치기"}</span>
      </button>
      {open && (
        <ul className="px-4 py-3 space-y-1.5 bg-card">
          {items.map((item) => (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                className={`block text-[13px] text-primary hover:underline
                  ${item.level === 1 ? "pl-0 font-medium" : item.level === 2 ? "pl-4" : "pl-8 text-muted-foreground"}
                `}
                onClick={(e) => {
                  e.preventDefault();
                  setOpen(false);
                  document.getElementById(item.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
              >
                {item.text}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

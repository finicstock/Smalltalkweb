import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useParams, Link } from "wouter";
import { Lock, Eye, Calendar, ArrowLeft, PlayCircle, TrendingUp, Crown } from "lucide-react";
import { getLoginUrl } from "@/const";
import { Streamdown } from "streamdown";

export default function ContentDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { user, isAuthenticated } = useAuth();

  const { data: content, isLoading } = trpc.content.getBySlug.useQuery(
    { slug: slug ?? "" },
    { enabled: !!slug }
  );

  const { data: subscription } = trpc.subscription.mySubscription.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
  });

  const hasAccess = content?.accessLevel === "free" || !!subscription;

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
      <article className="container py-8 max-w-4xl mx-auto">
        {/* Back */}
        <Link href="/contents">
          <Button variant="ghost" size="sm" className="gap-1.5 mb-6 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> 목록으로
          </Button>
        </Link>

        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            {content.accessLevel === "paid" && (
              <Badge variant="secondary" className="bg-primary text-primary-foreground text-xs gap-1">
                <Lock className="h-3 w-3" /> 유료
              </Badge>
            )}
            {content.contentType === "video" && (
              <Badge variant="secondary" className="text-xs gap-1">
                <PlayCircle className="h-3 w-3" /> 영상
              </Badge>
            )}
          </div>
          <h1 className="text-2xl md:text-4xl font-bold text-foreground leading-tight mb-4">
            {content.title}
          </h1>
          {content.excerpt && (
            <p className="text-lg text-muted-foreground leading-relaxed">{content.excerpt}</p>
          )}
          <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
            {content.publishedAt && (
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                {new Date(content.publishedAt).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Eye className="h-4 w-4" /> 조회 {content.viewCount}
            </span>
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

        {/* Body or Paywall */}
        {hasAccess ? (
          <div className="prose prose-lg max-w-none text-foreground
            prose-headings:text-foreground prose-p:text-foreground/90
            prose-a:text-primary prose-strong:text-foreground
            prose-blockquote:border-primary/30 prose-blockquote:text-muted-foreground
            prose-code:text-primary prose-code:bg-primary/5 prose-code:rounded prose-code:px-1
            content-body
          ">
            {content.body?.trim().startsWith('<') ? (
              <div dangerouslySetInnerHTML={{ __html: content.body }} />
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
                    <div dangerouslySetInnerHTML={{ __html: content.body.slice(0, 500) + "..." }} />
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
      </article>
    </Layout>
  );
}

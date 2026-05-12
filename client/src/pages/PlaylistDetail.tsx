import Layout from "@/components/Layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Eye, FileText, Lock, PlayCircle, TrendingUp } from "lucide-react";
import { Link, useRoute } from "wouter";

export default function PlaylistDetail() {
  const [, params] = useRoute("/playlists/:slug");
  const slug = params?.slug ?? "";

  const { data: playlist, isLoading: isPlaylistLoading } = trpc.playlist.getBySlug.useQuery(
    { slug },
    { enabled: Boolean(slug) }
  );
  const { data: contents, isLoading: isContentsLoading } = trpc.playlist.getContents.useQuery(
    { playlistId: playlist?.id ?? 0 },
    { enabled: Boolean(playlist?.id) }
  );
  const contentItems = (contents ?? []).filter((item): item is NonNullable<typeof item> => Boolean(item));

  if (isPlaylistLoading) {
    return (
      <Layout>
        <div className="container py-10">
          <div className="h-8 w-48 rounded bg-muted animate-pulse mb-4" />
          <div className="h-4 w-80 rounded bg-muted animate-pulse" />
        </div>
      </Layout>
    );
  }

  if (!playlist) {
    return (
      <Layout>
        <div className="container py-20 text-center">
          <FileText className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-3">재생목록을 찾을 수 없습니다</h1>
          <p className="text-muted-foreground mb-6">삭제되었거나 공개되지 않은 재생목록입니다.</p>
          <Link href="/contents">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" /> 콘텐츠로 돌아가기
            </Button>
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="bg-gradient-to-b from-primary/5 to-background">
        <div className="container py-10">
          <Link href="/contents">
            <Button variant="ghost" size="sm" className="gap-1.5 mb-5 text-muted-foreground">
              <ArrowLeft className="h-4 w-4" /> 콘텐츠
            </Button>
          </Link>
          <div className="max-w-3xl">
            <Badge variant="secondary" className="mb-3">재생목록</Badge>
            <h1 className="text-3xl font-bold text-foreground mb-3">{playlist.title}</h1>
            {playlist.description && (
              <p className="text-muted-foreground leading-relaxed">{playlist.description}</p>
            )}
          </div>
        </div>
      </div>

      <div className="container py-8">
        {isContentsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, index) => (
              <Card key={index} className="overflow-hidden animate-pulse">
                <div className="h-48 bg-muted" />
                <CardContent className="p-5 space-y-3">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-full" />
                  <div className="h-3 bg-muted rounded w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : contentItems.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {contentItems.map((item) => (
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
                        {item.contentType === "video" ? (
                          <PlayCircle className="h-12 w-12 text-primary/30" />
                        ) : (
                          <TrendingUp className="h-12 w-12 text-primary/30" />
                        )}
                      </div>
                    )}
                    <div className="absolute top-3 left-3 flex gap-2">
                      {item.accessLevel === "paid" && (
                        <Badge variant="secondary" className="bg-primary text-primary-foreground text-xs gap-1">
                          <Lock className="h-3 w-3" /> 유료
                        </Badge>
                      )}
                      {item.contentType === "video" && (
                        <Badge variant="secondary" className="text-xs gap-1">
                          <PlayCircle className="h-3 w-3" /> 영상
                        </Badge>
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
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <FileText className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
            <h2 className="text-lg font-medium text-muted-foreground">아직 재생목록에 콘텐츠가 없습니다</h2>
          </div>
        )}
      </div>
    </Layout>
  );
}

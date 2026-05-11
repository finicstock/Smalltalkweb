import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { useState } from "react";
import { Search, Lock, Eye, TrendingUp, PlayCircle } from "lucide-react";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");

  const { data: results, isLoading } = trpc.content.listPublished.useQuery(
    { search: submitted, limit: 20 },
    { enabled: !!submitted }
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) setSubmitted(query.trim());
  };

  return (
    <Layout>
      <div className="container py-10 max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-foreground mb-6">검색</h1>

        <form onSubmit={handleSearch} className="mb-10">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="검색어를 입력하세요..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-12 pr-24 h-14 text-lg rounded-xl"
              autoFocus
            />
            <Button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2">
              검색
            </Button>
          </div>
        </form>

        {submitted && (
          <p className="text-sm text-muted-foreground mb-6">
            "<span className="font-medium text-foreground">{submitted}</span>" 검색 결과
            {results && ` (${results.length}건)`}
          </p>
        )}

        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-5 flex gap-4">
                  <div className="w-24 h-24 bg-muted rounded-lg shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-full" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {results && results.length > 0 && (
          <div className="space-y-4">
            {results.map((item) => (
              <Link key={item.id} href={`/contents/${item.slug}`}>
                <Card className="group cursor-pointer hover:shadow-md transition-all">
                  <CardContent className="p-5 flex gap-4">
                    <div className="w-24 h-24 bg-muted rounded-lg shrink-0 overflow-hidden">
                      {item.thumbnailUrl ? (
                        <img src={item.thumbnailUrl} alt={item.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-primary/5">
                          <TrendingUp className="h-8 w-8 text-primary/30" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {item.accessLevel === "paid" && (
                          <Badge variant="secondary" className="bg-primary text-primary-foreground text-xs gap-0.5">
                            <Lock className="h-2.5 w-2.5" /> 유료
                          </Badge>
                        )}
                        {item.contentType === "video" && (
                          <Badge variant="secondary" className="text-xs gap-0.5">
                            <PlayCircle className="h-2.5 w-2.5" /> 영상
                          </Badge>
                        )}
                      </div>
                      <h3 className="font-semibold text-card-foreground group-hover:text-primary transition-colors line-clamp-1">
                        {item.title}
                      </h3>
                      {item.excerpt && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{item.excerpt}</p>
                      )}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
                        <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {item.viewCount}</span>
                        {item.publishedAt && <span>{new Date(item.publishedAt).toLocaleDateString("ko-KR")}</span>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {submitted && results && results.length === 0 && !isLoading && (
          <div className="text-center py-16">
            <Search className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground">검색 결과가 없습니다</h3>
            <p className="text-sm text-muted-foreground/60 mt-2">다른 키워드로 검색해 보세요.</p>
          </div>
        )}

        {!submitted && (
          <div className="text-center py-16">
            <Search className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground">찾고 싶은 콘텐츠를 검색해 보세요</h3>
          </div>
        )}
      </div>
    </Layout>
  );
}

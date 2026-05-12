import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { Link, useSearch } from "wouter";
import { useState, useMemo } from "react";
import { Search, Lock, Eye, TrendingUp, PlayCircle, FileText, ChevronLeft, ChevronRight, X, Clock, Calendar, Flame, Layers, BookOpen } from "lucide-react";
import { estimateReadingMinutes, formatContentDate, getAccessLabel, getContentTypeLabel } from "@/lib/contentUtils";

const ITEMS_PER_PAGE = 12;

function ContentCard({ item, categoryName }: { item: any; categoryName?: string }) {
  const readingMinutes = estimateReadingMinutes(item.body ?? item.excerpt);

  return (
    <Link href={`/contents/${item.slug}`}>
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
          <div className="absolute top-3 left-3 flex flex-wrap gap-2">
            <Badge variant={item.accessLevel === "paid" ? "default" : "secondary"} className="text-xs gap-1">
              {item.accessLevel === "paid" && <Lock className="h-3 w-3" />}
              {getAccessLabel(item.accessLevel)}
            </Badge>
            <Badge variant="secondary" className="text-xs gap-1">
              {item.contentType === "video" ? <PlayCircle className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
              {getContentTypeLabel(item.contentType)}
            </Badge>
          </div>
        </div>
        <CardContent className="p-5 space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {categoryName && <Badge variant="outline" className="text-[11px]">{categoryName}</Badge>}
            <Badge variant="outline" className="gap-1 text-[11px]">
              <Clock className="h-3 w-3" /> 완독 {readingMinutes}분
            </Badge>
          </div>
          <h3 className="font-semibold text-card-foreground line-clamp-2 group-hover:text-primary transition-colors">
            {item.title}
          </h3>
          {item.excerpt && (
            <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">{item.excerpt}</p>
          )}
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-1">
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" /> {(item.viewCount ?? 0).toLocaleString()}
            </span>
            {item.publishedAt && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" /> {formatContentDate(item.publishedAt)}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function Contents() {
  const searchString = useSearch();
  const params = useMemo(() => new URLSearchParams(searchString), [searchString]);
  const initialSearch = params.get("q") ?? "";

  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [submittedSearch, setSubmittedSearch] = useState(initialSearch);
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>(undefined);
  const [contentType, setContentType] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(0);

  const { data: categories } = trpc.category.listWithCounts.useQuery();
  const { data: playlists } = trpc.playlist.listPublic.useQuery();
  const { data: popularContents } = trpc.content.listPopular.useQuery({ limit: 5 });

  const { data: contents, isLoading } = trpc.content.listPublished.useQuery({
    limit: ITEMS_PER_PAGE,
    offset: page * ITEMS_PER_PAGE,
    categoryId: selectedCategory,
    search: submittedSearch || undefined,
    contentType: contentType,
  });

  const { data: totalCount } = trpc.content.countPublished.useQuery({
    categoryId: selectedCategory,
    search: submittedSearch || undefined,
    contentType: contentType,
  });

  const totalPages = Math.ceil((totalCount ?? 0) / ITEMS_PER_PAGE);
  const hasActiveFilters = !!submittedSearch || selectedCategory !== undefined || contentType !== undefined;
  const categoryNameById = useMemo(() => {
    const map = new Map<number, string>();
    categories?.forEach((cat) => map.set(cat.id, cat.name));
    return map;
  }, [categories]);
  const categoryTotalCount = categories?.reduce((sum, cat) => sum + (Number(cat.contentCount) || 0), 0) ?? 0;
  const fallbackPlaylists = [
    { id: "starter", title: "처음 읽는 투자 흐름", slug: "starter", description: "입문자에게 필요한 기본 관점과 읽는 순서", thumbnailUrl: null },
    { id: "market", title: "주간 시장 리뷰", slug: "market", description: "주간 시장 변수와 체크포인트", thumbnailUrl: null },
    { id: "premium", title: "프리미엄 리포트", slug: "premium", description: "구독자 전용 심화 분석", thumbnailUrl: null },
  ];
  const playlistCards = playlists && playlists.length > 0 ? playlists : fallbackPlaylists;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittedSearch(searchQuery);
    setPage(0);
  };

  const resetFilters = () => {
    setSearchQuery("");
    setSubmittedSearch("");
    setSelectedCategory(undefined);
    setContentType(undefined);
    setPage(0);
  };

  return (
    <Layout>
      <div className="bg-gradient-to-b from-primary/5 to-background">
        <div className="container py-10">
          <h1 className="text-3xl font-bold text-foreground mb-2">콘텐츠</h1>
          <p className="text-muted-foreground">닉스의 투자 인사이트를 만나보세요</p>
        </div>
      </div>

      <div className="container py-8">
        {/* Search */}
        <form onSubmit={handleSearch} className="mb-8">
          <div className="relative max-w-lg">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="콘텐츠 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-20"
            />
            <Button type="submit" size="sm" className="absolute right-1.5 top-1/2 -translate-y-1/2">
              검색
            </Button>
          </div>
        </form>

        {!hasActiveFilters && (
          <div className="mb-8 grid grid-cols-1 gap-3 md:grid-cols-3">
            {[
              { title: "필독 먼저 보기", desc: "처음이라면 채널의 관점과 읽는 순서를 먼저 확인하세요.", href: "/contents?q=필독", icon: <BookOpen className="h-4 w-4" /> },
              { title: "인기 글 따라잡기", desc: "조회수가 높은 글부터 빠르게 시장 흐름을 잡습니다.", href: "#popular-contents", icon: <Flame className="h-4 w-4" /> },
              { title: "시리즈로 보기", desc: "주제별 재생목록으로 이어지는 콘텐츠를 묶어서 봅니다.", href: "#playlist-section", icon: <Layers className="h-4 w-4" /> },
            ].map((item) => (
              <a key={item.title} href={item.href} className="rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/40">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">{item.icon}</span>
                  {item.title}
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">{item.desc}</p>
              </a>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="space-y-4 mb-8">
          {/* Content Type Filter */}
          <Tabs value={contentType ?? "all"} onValueChange={(v) => { setContentType(v === "all" ? undefined : v); setPage(0); }}>
            <TabsList>
              <TabsTrigger value="all">전체</TabsTrigger>
              <TabsTrigger value="article" className="gap-1.5">
                <FileText className="h-3.5 w-3.5" /> 아티클
              </TabsTrigger>
              <TabsTrigger value="video" className="gap-1.5">
                <PlayCircle className="h-3.5 w-3.5" /> 영상
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Category Filter */}
          {categories && categories.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedCategory === undefined ? "default" : "outline"}
                size="sm"
                onClick={() => { setSelectedCategory(undefined); setPage(0); }}
              >
                전체 <span className="ml-1 text-xs opacity-70">{categoryTotalCount}</span>
              </Button>
              {categories.map((cat) => (
                <Button
                  key={cat.id}
                  variant={selectedCategory === cat.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => { setSelectedCategory(cat.id); setPage(0); }}
                >
                  {cat.name} <span className="ml-1 text-xs opacity-70">{Number(cat.contentCount) || 0}</span>
                </Button>
              ))}
            </div>
          )}

          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">적용된 조건</span>
              {submittedSearch && <Badge variant="secondary">검색: {submittedSearch}</Badge>}
              {contentType && <Badge variant="secondary">{contentType === "article" ? "아티클" : "영상"}</Badge>}
              {selectedCategory !== undefined && (
                <Badge variant="secondary">
                  {categories?.find((cat) => cat.id === selectedCategory)?.name ?? "카테고리"}
                </Badge>
              )}
              <Button variant="ghost" size="sm" className="ml-auto h-7 gap-1 px-2" onClick={resetFilters}>
                <X className="h-3.5 w-3.5" /> 초기화
              </Button>
            </div>
          )}
        </div>

        {/* Playlists */}
        {!submittedSearch && !selectedCategory && (
          <div id="playlist-section" className="mb-10 scroll-mt-24">
            <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-foreground">재생목록 / 시리즈</h2>
                <p className="text-sm text-muted-foreground">주제별로 이어 읽기 좋은 콘텐츠 묶음입니다.</p>
              </div>
              <Badge variant="secondary">{playlists && playlists.length > 0 ? `${playlists.length}개 시리즈` : "시리즈 준비 중"}</Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {playlistCards.map((pl) => (
                <Link key={pl.id} href={typeof pl.id === "number" ? `/playlists/${pl.slug}` : "/contents"}>
                  <Card className="group cursor-pointer hover:shadow-md transition-all overflow-hidden">
                    <div className="h-32 bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                      {pl.thumbnailUrl ? (
                        <img src={pl.thumbnailUrl} alt={pl.title} className="w-full h-full object-cover" />
                      ) : (
                        <PlayCircle className="h-10 w-10 text-primary/40" />
                      )}
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-medium text-card-foreground group-hover:text-primary transition-colors line-clamp-1">
                        {pl.title}
                      </h3>
                      {pl.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{pl.description}</p>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}

        {popularContents && popularContents.length > 0 && !hasActiveFilters && (
          <div id="popular-contents" className="mb-10 scroll-mt-24">
            <div className="mb-4 flex items-center gap-2">
              <Flame className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">많이 본 콘텐츠</h2>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
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
        )}

        {/* Content Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
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
        ) : contents && contents.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {contents.map((item) => (
                <ContentCard key={item.id} item={item} categoryName={item.categoryId ? categoryNameById.get(item.categoryId) : undefined} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-10">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => setPage(p => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground px-3">
                  {page + 1} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage(p => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-20">
            <TrendingUp className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground">
              {submittedSearch ? `"${submittedSearch}" 검색 결과가 없습니다` : "아직 콘텐츠가 없습니다"}
            </h3>
            <p className="text-sm text-muted-foreground/60 mt-2">곧 새로운 콘텐츠가 올라옵니다.</p>
          </div>
        )}
      </div>
    </Layout>
  );
}

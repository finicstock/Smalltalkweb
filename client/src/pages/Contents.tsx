import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { Link, useSearch } from "wouter";
import { useState, useMemo } from "react";
import { Search, Lock, Eye, TrendingUp, PlayCircle, FileText, ChevronLeft, ChevronRight, X } from "lucide-react";

const ITEMS_PER_PAGE = 12;

export default function Contents() {
  const searchString = useSearch();
  const params = useMemo(() => new URLSearchParams(searchString), [searchString]);
  const initialSearch = params.get("q") ?? "";

  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [submittedSearch, setSubmittedSearch] = useState(initialSearch);
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>(undefined);
  const [contentType, setContentType] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(0);

  const { data: categories } = trpc.category.list.useQuery();
  const { data: playlists } = trpc.playlist.listPublic.useQuery();

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
                전체
              </Button>
              {categories.map((cat) => (
                <Button
                  key={cat.id}
                  variant={selectedCategory === cat.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => { setSelectedCategory(cat.id); setPage(0); }}
                >
                  {cat.name}
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
        {playlists && playlists.length > 0 && !submittedSearch && !selectedCategory && (
          <div className="mb-10">
            <h2 className="text-xl font-semibold text-foreground mb-4">재생목록</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {playlists.map((pl) => (
                <Link key={pl.id} href={`/playlists/${pl.slug}`}>
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

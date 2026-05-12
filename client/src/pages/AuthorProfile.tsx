import { useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Link } from "wouter";
import { Twitter, Youtube, Instagram, Globe, Edit2, Save, X, Crown, FileText, Eye } from "lucide-react";
import { toast } from "sonner";

export default function AuthorProfile() {
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const { data: profile, isLoading } = trpc.author.get.useQuery();
  const { data: stats } = trpc.author.publicStats.useQuery();
  const { data: recentContentsRaw } = trpc.author.publicContents.useQuery({ limit: 6 });

  const updateProfile = trpc.author.update.useMutation({
    onSuccess: () => {
      utils.author.get.invalidate();
      toast.success("프로필이 저장되었습니다.");
      setEditing(false);
    },
    onError: () => toast.error("저장에 실패했습니다."),
  });

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    displayName: "",
    bio: "",
    twitterUrl: "",
    youtubeUrl: "",
    instagramUrl: "",
    websiteUrl: "",
  });

  const startEdit = () => {
    setForm({
      displayName: user?.name ?? "",
      bio: profile?.bio ?? "",
      twitterUrl: profile?.twitterUrl ?? "",
      youtubeUrl: "",
      instagramUrl: profile?.instagramUrl ?? "",
      websiteUrl: profile?.websiteUrl ?? "",
    });
    setEditing(true);
  };

  const handleSave = () => {
    updateProfile.mutate(form);
  };

  const isAdmin = user?.role === "admin";

  if (isLoading) {
    return (
      <Layout>
        <div className="container py-10 max-w-3xl mx-auto animate-pulse space-y-4">
          <div className="h-24 w-24 rounded-full bg-muted mx-auto" />
          <div className="h-6 bg-muted rounded w-48 mx-auto" />
          <div className="h-4 bg-muted rounded w-64 mx-auto" />
        </div>
      </Layout>
    );
  }

  const displayName = user?.name ?? "닉스";
  const bio = profile?.bio ?? "투자 대회 1위 출신 닉스의 투자 이야기";
  const avatarUrl = profile?.profileImageUrl ?? user?.avatarUrl;

  return (
    <Layout>
      <div className="container py-10 max-w-3xl mx-auto">
        {/* 프로필 헤더 */}
        <Card className="mb-8">
          <CardContent className="p-8">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              {/* 아바타 */}
              <div className="flex-shrink-0">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="h-24 w-24 rounded-full object-cover border-2 border-border"
                  />
                ) : (
                  <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center border-2 border-border">
                    <span className="text-3xl font-bold text-primary">{displayName[0]}</span>
                  </div>
                )}
              </div>

              {/* 정보 */}
              <div className="flex-1 text-center sm:text-left">
                {editing ? (
                  <div className="space-y-3">
                    <input
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground"
                      placeholder="표시 이름"
                      value={form.displayName}
                      onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))}
                    />
                    <textarea
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground resize-none"
                      placeholder="소개 (바이오)"
                      rows={3}
                      value={form.bio}
                      onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        className="border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground"
                        placeholder="트위터 URL"
                        value={form.twitterUrl}
                        onChange={e => setForm(f => ({ ...f, twitterUrl: e.target.value }))}
                      />
                      <input
                        className="border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground"
                        placeholder="유튜브 URL"
                        value={form.youtubeUrl}
                        onChange={e => setForm(f => ({ ...f, youtubeUrl: e.target.value }))}
                      />
                      <input
                        className="border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground"
                        placeholder="인스타그램 URL"
                        value={form.instagramUrl}
                        onChange={e => setForm(f => ({ ...f, instagramUrl: e.target.value }))}
                      />
                      <input
                        className="border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground"
                        placeholder="웹사이트 URL"
                        value={form.websiteUrl}
                        onChange={e => setForm(f => ({ ...f, websiteUrl: e.target.value }))}
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
                        <X className="h-4 w-4 mr-1" /> 취소
                      </Button>
                      <Button size="sm" onClick={handleSave} disabled={updateProfile.isPending}>
                        <Save className="h-4 w-4 mr-1" /> 저장
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                      <h1 className="text-2xl font-bold text-foreground">{displayName}</h1>
                      <Badge variant="secondary" className="text-xs gap-1">
                        <Crown className="h-3 w-3" /> 작성자
                      </Badge>
                    </div>
                    <p className="text-muted-foreground text-sm leading-relaxed mb-4">{bio}</p>

                    {/* SNS 링크 */}
                    <div className="flex items-center justify-center sm:justify-start gap-3">
                      {profile?.twitterUrl && (
                        <a href={profile.twitterUrl} target="_blank" rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground transition-colors">
                          <Twitter className="h-5 w-5" />
                        </a>
                      )}
                      {profile?.instagramUrl && (
                        <a href={profile.instagramUrl} target="_blank" rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-pink-500 transition-colors">
                          <Instagram className="h-5 w-5" />
                        </a>
                      )}
                      {profile?.websiteUrl && (
                        <a href={profile.websiteUrl} target="_blank" rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground transition-colors">
                          <Globe className="h-5 w-5" />
                        </a>
                      )}
                    </div>

                    {isAdmin && (
                      <Button variant="outline" size="sm" className="mt-4 gap-1.5" onClick={startEdit}>
                        <Edit2 className="h-3.5 w-3.5" /> 프로필 수정
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 채널 통계 */}
        {stats && (
          <div className="grid grid-cols-3 gap-3 mb-8">
            <div className="bg-card border border-border rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{stats.publishedContents ?? 0}</p>
              <p className="text-[12px] text-muted-foreground mt-0.5 flex items-center justify-center gap-1">
                <FileText className="h-3 w-3" /> 발행 콘텐츠
              </p>
            </div>
            <div className="bg-card border border-border rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{stats.totalUsers ?? 0}</p>
              <p className="text-[12px] text-muted-foreground mt-0.5 flex items-center justify-center gap-1">
                <Crown className="h-3 w-3" /> 전체 회원
              </p>
            </div>
            <div className="bg-card border border-border rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{stats.activeSubscriptions ?? 0}</p>
              <p className="text-[12px] text-muted-foreground mt-0.5 flex items-center justify-center gap-1">
                <Eye className="h-3 w-3" /> 유료 구독자
              </p>
            </div>
          </div>
        )}

        <Separator className="mb-8" />

        {/* 최근 콘텐츠 */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-foreground">최근 콘텐츠</h2>
            <Link href="/contents">
              <span className="text-[13px] text-primary hover:underline cursor-pointer">전체보기 →</span>
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(recentContentsRaw ?? []).filter((c: any) => c.status === "published").slice(0, 6).map((c: any) => (
              <Link key={c.id} href={`/contents/${c.slug}`}>
                <div className="bg-card border border-border rounded-lg p-4 hover:border-primary/30 transition-colors cursor-pointer">
                  {c.thumbnailUrl && (
                    <img src={c.thumbnailUrl} alt={c.title} className="w-full h-32 object-cover rounded-md mb-3" />
                  )}
                  <p className="text-[13px] font-medium text-foreground line-clamp-2">{c.title}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {new Date(c.publishedAt ?? c.createdAt).toLocaleDateString("ko-KR")}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}

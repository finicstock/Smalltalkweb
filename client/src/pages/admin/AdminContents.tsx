import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import MarkdownEditor from "@/components/MarkdownEditor";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Pencil, Trash2, Eye, Lock, Globe, Search, PenSquare } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim() || `content-${Date.now()}`;
}

type StatusFilter = "all" | "published" | "draft" | "archived";

export default function AdminContents() {
  const utils = trpc.useUtils();
  const { data: contents, isLoading, error: contentsError } = trpc.admin.listContents.useQuery({ limit: 100 });
  const { data: categories } = trpc.admin.listCategories.useQuery();
  const createContent = trpc.admin.createContent.useMutation({
    onSuccess: () => { utils.admin.listContents.invalidate(); toast.success("콘텐츠가 생성되었습니다."); setIsOpen(false); resetForm(); },
    onError: (err) => toast.error(err.message || "콘텐츠 생성에 실패했습니다."),
  });
  const updateContent = trpc.admin.updateContent.useMutation({
    onSuccess: () => { utils.admin.listContents.invalidate(); toast.success("콘텐츠가 수정되었습니다."); setIsOpen(false); resetForm(); },
    onError: (err) => toast.error(err.message || "콘텐츠 수정에 실패했습니다."),
  });
  const deleteContent = trpc.admin.deleteContent.useMutation({
    onSuccess: () => { utils.admin.listContents.invalidate(); toast.success("콘텐츠가 삭제되었습니다."); },
    onError: (err) => toast.error(err.message || "콘텐츠 삭제에 실패했습니다."),
  });

  const [isOpen, setIsOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [location] = useLocation();

  // /admin/contents/new 라우트로 접근 시 자동으로 새글 작성 다이얼로그 열기
  useEffect(() => {
    if (location === "/admin/contents/new") {
      resetForm();
      setIsOpen(true);
    }
  }, [location]);

  const [form, setForm] = useState({
    title: "", slug: "", excerpt: "", body: "", contentType: "article" as "article" | "video",
    videoUrl: "", accessLevel: "free" as "free" | "paid", status: "draft" as "draft" | "published" | "archived", categoryId: "",
  });

  const resetForm = () => {
    setForm({ title: "", slug: "", excerpt: "", body: "", contentType: "article", videoUrl: "", accessLevel: "free", status: "draft", categoryId: "" });
    setEditId(null);
  };

  const openEdit = (item: any) => {
    setEditId(item.id);
    setForm({
      title: item.title, slug: item.slug, excerpt: item.excerpt ?? "", body: item.body ?? "",
      contentType: item.contentType, videoUrl: item.videoUrl ?? "", accessLevel: item.accessLevel,
      status: item.status, categoryId: item.categoryId?.toString() ?? "",
    });
    setIsOpen(true);
  };

  const openNew = () => {
    resetForm();
    setIsOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      title: form.title,
      slug: form.slug || slugify(form.title),
      excerpt: form.excerpt || undefined,
      body: form.body || undefined,
      contentType: form.contentType,
      videoUrl: form.videoUrl || undefined,
      accessLevel: form.accessLevel,
      status: form.status,
      categoryId: form.categoryId && form.categoryId !== "none" ? parseInt(form.categoryId) : undefined,
    };
    if (editId) {
      updateContent.mutate({ id: editId, ...data });
    } else {
      createContent.mutate(data);
    }
  };

  const filteredContents = useMemo(() => {
    if (!contents) return [];
    let filtered = contents;
    if (statusFilter !== "all") {
      filtered = filtered.filter((c) => c.status === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((c) => c.title.toLowerCase().includes(q));
    }
    return filtered;
  }, [contents, statusFilter, searchQuery]);

  const statusCounts = useMemo(() => {
    if (!contents) return { all: 0, published: 0, draft: 0, archived: 0 };
    return {
      all: contents.length,
      published: contents.filter((c) => c.status === "published").length,
      draft: contents.filter((c) => c.status === "draft").length,
      archived: contents.filter((c) => c.status === "archived").length,
    };
  }, [contents]);

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">콘텐츠 관리</h1>
        <Button size="sm" className="gap-1.5 text-[13px] bg-[#2B3A4E] hover:bg-[#1e2b3a]" onClick={openNew}>
          <PenSquare className="h-3.5 w-3.5" /> 새글쓰기
        </Button>
      </div>

      {/* Status Tabs + Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <TabsList className="bg-transparent p-0 h-auto gap-0 border-b border-gray-200 rounded-none w-full sm:w-auto">
            {[
              { value: "all", label: "전체", count: statusCounts.all },
              { value: "published", label: "발행", count: statusCounts.published },
              { value: "draft", label: "초안", count: statusCounts.draft },
              { value: "archived", label: "보관", count: statusCounts.archived },
            ].map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#2B3A4E] data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-[13px] text-gray-500 data-[state=active]:text-gray-900 data-[state=active]:font-medium"
              >
                {tab.label} <span className="ml-1 text-gray-400">{tab.count}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <Input
            placeholder="제목 검색"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-[13px] w-full sm:w-52 bg-white border-gray-200"
          />
        </div>
      </div>

      {/* Content Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {contentsError ? (
          <div className="p-8 text-center">
            <p className="text-sm text-red-500">데이터를 불러오는 중 오류가 발생했습니다.</p>
            <Button variant="outline" size="sm" className="mt-3 text-[13px]" onClick={() => utils.admin.listContents.invalidate()}>다시 시도</Button>
          </div>
        ) : isLoading ? (
          <div className="p-8 text-center text-sm text-gray-400">불러오는 중...</div>
        ) : filteredContents.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/80 hover:bg-gray-50/80">
                <TableHead className="text-[12px] font-medium text-gray-500 pl-4">제목</TableHead>
                <TableHead className="text-[12px] font-medium text-gray-500 w-20 text-center">상태</TableHead>
                <TableHead className="text-[12px] font-medium text-gray-500 w-20 text-center">접근</TableHead>
                <TableHead className="text-[12px] font-medium text-gray-500 w-20 text-center hidden sm:table-cell">조회수</TableHead>
                <TableHead className="text-[12px] font-medium text-gray-500 w-24 text-center hidden md:table-cell">작성일</TableHead>
                <TableHead className="text-[12px] font-medium text-gray-500 w-20 text-center">관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContents.map((item) => (
                <TableRow key={item.id} className="hover:bg-gray-50/50 group">
                  <TableCell className="pl-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] text-gray-900 font-medium truncate max-w-xs cursor-pointer hover:text-[#2B3A4E]" onClick={() => openEdit(item)}>
                        {item.title}
                      </span>
                      {item.contentType === "video" && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-blue-200 text-blue-600 bg-blue-50">영상</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant={item.status === "published" ? "default" : "secondary"}
                      className={`text-[11px] px-2 py-0.5 font-normal ${
                        item.status === "published"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                          : item.status === "draft"
                            ? "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50"
                            : "bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-100"
                      }`}
                    >
                      {item.status === "published" ? "발행" : item.status === "draft" ? "초안" : "보관"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {item.accessLevel === "paid" ? (
                      <span className="inline-flex items-center gap-0.5 text-[11px] text-amber-600">
                        <Lock className="h-3 w-3" /> 유료
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-0.5 text-[11px] text-gray-500">
                        <Globe className="h-3 w-3" /> 무료
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-center hidden sm:table-cell">
                    <span className="text-[12px] text-gray-500 flex items-center justify-center gap-0.5">
                      <Eye className="h-3 w-3" /> {item.viewCount?.toLocaleString() ?? 0}
                    </span>
                  </TableCell>
                  <TableCell className="text-center hidden md:table-cell">
                    <span className="text-[12px] text-gray-400">
                      {new Date(item.createdAt).toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" })}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-0.5">
                      <button
                        onClick={() => openEdit(item)}
                        className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>콘텐츠 삭제</AlertDialogTitle>
                            <AlertDialogDescription>"{item.title}"을(를) 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>취소</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteContent.mutate({ id: item.id })}>삭제</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="py-16 text-center">
            <p className="text-sm text-gray-400">
              {searchQuery ? "검색 결과가 없습니다." : "아직 콘텐츠가 없습니다."}
            </p>
            {!searchQuery && (
              <Button variant="outline" size="sm" className="mt-3 text-[13px]" onClick={openNew}>
                첫 콘텐츠 작성하기
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Bottom info */}
      {filteredContents.length > 0 && (
        <p className="text-[12px] text-gray-400">총 {filteredContents.length}건</p>
      )}

      {/* Content Editor Dialog */}
      <Dialog open={isOpen} onOpenChange={(o) => { setIsOpen(o); if (!o) resetForm(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">{editId ? "콘텐츠 수정" : "새 콘텐츠 작성"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[13px]">제목 *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm(f => ({ ...f, title: e.target.value, slug: f.slug || slugify(e.target.value) }))}
                required
                className="text-[13px]"
                placeholder="콘텐츠 제목을 입력하세요"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px]">슬러그 (URL)</Label>
              <Input value={form.slug} onChange={(e) => setForm(f => ({ ...f, slug: e.target.value }))} placeholder="자동 생성" className="text-[13px]" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px]">요약</Label>
              <Textarea value={form.excerpt} onChange={(e) => setForm(f => ({ ...f, excerpt: e.target.value }))} rows={2} className="text-[13px]" placeholder="콘텐츠 목록에 표시될 요약문" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px]">본문 (Markdown)</Label>
              <MarkdownEditor value={form.body} onChange={(v) => setForm(f => ({ ...f, body: v }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[13px]">콘텐츠 유형</Label>
                <Select value={form.contentType} onValueChange={(v) => setForm(f => ({ ...f, contentType: v as any }))}>
                  <SelectTrigger className="text-[13px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="article">아티클</SelectItem>
                    <SelectItem value="video">영상</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[13px]">접근 권한</Label>
                <Select value={form.accessLevel} onValueChange={(v) => setForm(f => ({ ...f, accessLevel: v as any }))}>
                  <SelectTrigger className="text-[13px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">무료</SelectItem>
                    <SelectItem value="paid">유료 (구독자 전용)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {form.contentType === "video" && (
              <div className="space-y-1.5">
                <Label className="text-[13px]">영상 URL</Label>
                <Input value={form.videoUrl} onChange={(e) => setForm(f => ({ ...f, videoUrl: e.target.value }))} placeholder="YouTube embed URL" className="text-[13px]" />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[13px]">카테고리</Label>
                <Select value={form.categoryId} onValueChange={(v) => setForm(f => ({ ...f, categoryId: v }))}>
                  <SelectTrigger className="text-[13px]"><SelectValue placeholder="선택" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">없음</SelectItem>
                    {categories?.map((c) => (
                      <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[13px]">상태</Label>
                <Select value={form.status} onValueChange={(v) => setForm(f => ({ ...f, status: v as any }))}>
                  <SelectTrigger className="text-[13px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">초안</SelectItem>
                    <SelectItem value="published">발행</SelectItem>
                    <SelectItem value="archived">보관</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button type="button" variant="outline" size="sm" onClick={() => { setIsOpen(false); resetForm(); }} className="text-[13px]">취소</Button>
              <Button type="submit" size="sm" disabled={createContent.isPending || updateContent.isPending} className="text-[13px] bg-[#2B3A4E] hover:bg-[#1e2b3a]">
                {editId ? "수정 완료" : "작성 완료"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

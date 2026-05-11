import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import MarkdownEditor from "@/components/MarkdownEditor";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Eye, Lock, Globe } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim() || `content-${Date.now()}`;
}

export default function AdminContents() {
  const utils = trpc.useUtils();
  const { data: contents, isLoading } = trpc.admin.listContents.useQuery({ limit: 100 });
  const { data: categories } = trpc.admin.listCategories.useQuery();
  const createContent = trpc.admin.createContent.useMutation({ onSuccess: () => { utils.admin.listContents.invalidate(); toast.success("콘텐츠가 생성되었습니다."); setIsOpen(false); resetForm(); } });
  const updateContent = trpc.admin.updateContent.useMutation({ onSuccess: () => { utils.admin.listContents.invalidate(); toast.success("콘텐츠가 수정되었습니다."); setIsOpen(false); resetForm(); } });
  const deleteContent = trpc.admin.deleteContent.useMutation({ onSuccess: () => { utils.admin.listContents.invalidate(); toast.success("콘텐츠가 삭제되었습니다."); } });

  const [isOpen, setIsOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ title: "", slug: "", excerpt: "", body: "", contentType: "article" as "article" | "video", videoUrl: "", accessLevel: "free" as "free" | "paid", status: "draft" as "draft" | "published" | "archived", categoryId: "" });

  const resetForm = () => { setForm({ title: "", slug: "", excerpt: "", body: "", contentType: "article", videoUrl: "", accessLevel: "free", status: "draft", categoryId: "" }); setEditId(null); };

  const openEdit = (item: any) => {
    setEditId(item.id);
    setForm({
      title: item.title, slug: item.slug, excerpt: item.excerpt ?? "", body: item.body ?? "",
      contentType: item.contentType, videoUrl: item.videoUrl ?? "", accessLevel: item.accessLevel,
      status: item.status, categoryId: item.categoryId?.toString() ?? "",
    });
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">콘텐츠 관리</h1>
        <Dialog open={isOpen} onOpenChange={(o) => { setIsOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> 새 콘텐츠</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editId ? "콘텐츠 수정" : "새 콘텐츠 작성"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>제목 *</Label>
                <Input value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value, slug: f.slug || slugify(e.target.value) }))} required />
              </div>
              <div className="space-y-2">
                <Label>슬러그 (URL)</Label>
                <Input value={form.slug} onChange={(e) => setForm(f => ({ ...f, slug: e.target.value }))} placeholder="auto-generated" />
              </div>
              <div className="space-y-2">
                <Label>요약</Label>
                <Textarea value={form.excerpt} onChange={(e) => setForm(f => ({ ...f, excerpt: e.target.value }))} rows={2} />
              </div>
              <div className="space-y-2">
                <Label>본문 (Markdown)</Label>
                <MarkdownEditor value={form.body} onChange={(v) => setForm(f => ({ ...f, body: v }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>콘텐츠 유형</Label>
                  <Select value={form.contentType} onValueChange={(v) => setForm(f => ({ ...f, contentType: v as any }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="article">아티클</SelectItem>
                      <SelectItem value="video">영상</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>접근 권한</Label>
                  <Select value={form.accessLevel} onValueChange={(v) => setForm(f => ({ ...f, accessLevel: v as any }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">무료</SelectItem>
                      <SelectItem value="paid">유료</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {form.contentType === "video" && (
                <div className="space-y-2">
                  <Label>영상 URL</Label>
                  <Input value={form.videoUrl} onChange={(e) => setForm(f => ({ ...f, videoUrl: e.target.value }))} placeholder="YouTube embed URL" />
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>카테고리</Label>
                  <Select value={form.categoryId} onValueChange={(v) => setForm(f => ({ ...f, categoryId: v }))}>
                    <SelectTrigger><SelectValue placeholder="선택" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">없음</SelectItem>
                      {categories?.map((c) => (
                        <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>상태</Label>
                  <Select value={form.status} onValueChange={(v) => setForm(f => ({ ...f, status: v as any }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">초안</SelectItem>
                      <SelectItem value="published">발행</SelectItem>
                      <SelectItem value="archived">보관</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => { setIsOpen(false); resetForm(); }}>취소</Button>
                <Button type="submit" disabled={createContent.isPending || updateContent.isPending}>
                  {editId ? "수정" : "작성"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Card key={i} className="animate-pulse"><CardContent className="p-4 h-16" /></Card>)}
        </div>
      ) : contents && contents.length > 0 ? (
        <div className="space-y-3">
          {contents.map((item) => (
            <Card key={item.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-foreground truncate">{item.title}</h3>
                    <Badge variant={item.status === "published" ? "default" : "secondary"} className="text-xs shrink-0">
                      {item.status === "published" ? "발행" : item.status === "draft" ? "초안" : "보관"}
                    </Badge>
                    {item.accessLevel === "paid" ? (
                      <Badge variant="outline" className="text-xs gap-0.5 shrink-0"><Lock className="h-2.5 w-2.5" /> 유료</Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs gap-0.5 shrink-0"><Globe className="h-2.5 w-2.5" /> 무료</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {item.viewCount}</span>
                    <span>{new Date(item.createdAt).toLocaleDateString("ko-KR")}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(item)}><Pencil className="h-4 w-4" /></Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
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
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground">
            아직 콘텐츠가 없습니다. "새 콘텐츠" 버튼을 눌러 첫 콘텐츠를 작성해 보세요.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

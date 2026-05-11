import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, ListMusic } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function AdminPlaylists() {
  const utils = trpc.useUtils();
  const { data: playlists, isLoading } = trpc.admin.listPlaylists.useQuery();
  const createPlaylist = trpc.admin.createPlaylist.useMutation({ onSuccess: () => { utils.admin.listPlaylists.invalidate(); toast.success("재생목록이 생성되었습니다."); setIsOpen(false); resetForm(); } });
  const updatePlaylist = trpc.admin.updatePlaylist.useMutation({ onSuccess: () => { utils.admin.listPlaylists.invalidate(); toast.success("재생목록이 수정되었습니다."); setIsOpen(false); resetForm(); } });
  const deletePlaylist = trpc.admin.deletePlaylist.useMutation({ onSuccess: () => { utils.admin.listPlaylists.invalidate(); toast.success("재생목록이 삭제되었습니다."); } });

  const [isOpen, setIsOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ title: "", slug: "", description: "" });

  const resetForm = () => { setForm({ title: "", slug: "", description: "" }); setEditId(null); };

  const openEdit = (item: any) => {
    setEditId(item.id);
    setForm({ title: item.title, slug: item.slug, description: item.description ?? "" });
    setIsOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const slug = form.slug || form.title.toLowerCase().replace(/[^a-z0-9가-힣\s-]/g, "").replace(/\s+/g, "-") || `pl-${Date.now()}`;
    if (editId) {
      updatePlaylist.mutate({ id: editId, title: form.title, slug, description: form.description || undefined });
    } else {
      createPlaylist.mutate({ title: form.title, slug, description: form.description || undefined });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">재생목록 관리</h1>
        <Dialog open={isOpen} onOpenChange={(o) => { setIsOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> 새 재생목록</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editId ? "재생목록 수정" : "새 재생목록"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>제목 *</Label>
                <Input value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>슬러그 (URL)</Label>
                <Input value={form.slug} onChange={(e) => setForm(f => ({ ...f, slug: e.target.value }))} placeholder="auto-generated" />
              </div>
              <div className="space-y-2">
                <Label>설명</Label>
                <Textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => { setIsOpen(false); resetForm(); }}>취소</Button>
                <Button type="submit">{editId ? "수정" : "생성"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2].map(i => <Card key={i} className="animate-pulse"><CardContent className="p-4 h-14" /></Card>)}</div>
      ) : playlists && playlists.length > 0 ? (
        <div className="space-y-3">
          {playlists.map((pl) => (
            <Card key={pl.id}>
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <ListMusic className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">{pl.title}</h3>
                    <p className="text-xs text-muted-foreground">{pl.description || "설명 없음"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(pl)}><Pencil className="h-4 w-4" /></Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>재생목록 삭제</AlertDialogTitle>
                        <AlertDialogDescription>"{pl.title}" 재생목록을 삭제하시겠습니까?</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>취소</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deletePlaylist.mutate({ id: pl.id })}>삭제</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card><CardContent className="p-10 text-center text-muted-foreground">아직 재생목록이 없습니다.</CardContent></Card>
      )}
    </div>
  );
}

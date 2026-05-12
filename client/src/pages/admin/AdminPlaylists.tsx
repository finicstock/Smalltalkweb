import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, ListMusic } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function AdminPlaylists() {
  const utils = trpc.useUtils();
  const { data: playlists, isLoading, error: playlistsError } = trpc.admin.listPlaylists.useQuery();
  const createPlaylist = trpc.admin.createPlaylist.useMutation({
    onSuccess: () => { utils.admin.listPlaylists.invalidate(); toast.success("재생목록이 생성되었습니다."); setIsOpen(false); resetForm(); },
    onError: (err) => toast.error(err.message || "재생목록 생성에 실패했습니다."),
  });
  const updatePlaylist = trpc.admin.updatePlaylist.useMutation({
    onSuccess: () => { utils.admin.listPlaylists.invalidate(); toast.success("재생목록이 수정되었습니다."); setIsOpen(false); resetForm(); },
    onError: (err) => toast.error(err.message || "재생목록 수정에 실패했습니다."),
  });
  const deletePlaylist = trpc.admin.deletePlaylist.useMutation({
    onSuccess: () => { utils.admin.listPlaylists.invalidate(); toast.success("재생목록이 삭제되었습니다."); },
    onError: (err) => toast.error(err.message || "재생목록 삭제에 실패했습니다."),
  });

  const [isOpen, setIsOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ title: "", slug: "", description: "" });

  const resetForm = () => { setForm({ title: "", slug: "", description: "" }); setEditId(null); };

  const openEdit = (item: any) => {
    setEditId(item.id);
    setForm({ title: item.title, slug: item.slug, description: item.description ?? "" });
    setIsOpen(true);
  };

  const openNew = () => { resetForm(); setIsOpen(true); };

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
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">재생목록 관리</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">콘텐츠를 묶어 시리즈로 제공합니다.</p>
        </div>
        <Button size="sm" className="gap-1.5 text-[13px] bg-[#2B3A4E] hover:bg-[#1e2b3a]" onClick={openNew}>
          <Plus className="h-3.5 w-3.5" /> 재생목록 추가
        </Button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {playlistsError ? (
          <div className="p-8 text-center">
            <p className="text-sm text-red-500">데이터를 불러오는 중 오류가 발생했습니다.</p>
            <Button variant="outline" size="sm" className="mt-3 text-[13px]" onClick={() => utils.admin.listPlaylists.invalidate()}>다시 시도</Button>
          </div>
        ) : isLoading ? (
          <div className="p-8 text-center text-sm text-gray-400">불러오는 중...</div>
        ) : playlists && playlists.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/50 hover:bg-gray-50/50">
                <TableHead className="text-[12px] font-medium text-gray-500 pl-4 w-10"></TableHead>
                <TableHead className="text-[12px] font-medium text-gray-500">제목</TableHead>
                <TableHead className="text-[12px] font-medium text-gray-500 hidden sm:table-cell">설명</TableHead>
                <TableHead className="text-[12px] font-medium text-gray-500 w-20 text-center">관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {playlists.map((pl) => (
                <TableRow key={pl.id} className="hover:bg-gray-50/50 group">
                  <TableCell className="pl-4 py-2.5">
                    <div className="h-8 w-8 rounded-md bg-gray-100 flex items-center justify-center">
                      <ListMusic className="h-4 w-4 text-gray-400" />
                    </div>
                  </TableCell>
                  <TableCell className="py-2.5">
                    <span className="text-[13px] font-medium text-gray-900">{pl.title}</span>
                    <p className="text-[11px] text-gray-400 mt-0.5">/{pl.slug}</p>
                  </TableCell>
                  <TableCell className="py-2.5 hidden sm:table-cell">
                    <span className="text-[12px] text-gray-400 truncate max-w-xs block">{pl.description || "-"}</span>
                  </TableCell>
                  <TableCell className="text-center py-2.5">
                    <div className="flex items-center justify-center gap-0.5">
                      <button onClick={() => openEdit(pl)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
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
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="py-16 text-center">
            <ListMusic className="h-10 w-10 text-gray-200 mx-auto mb-3" />
            <p className="text-[13px] text-gray-400">아직 재생목록이 없습니다.</p>
            <Button variant="outline" size="sm" className="mt-3 text-[13px]" onClick={openNew}>
              첫 재생목록 만들기
            </Button>
          </div>
        )}
      </div>

      {/* Playlist Editor Dialog */}
      <Dialog open={isOpen} onOpenChange={(o) => { setIsOpen(o); if (!o) resetForm(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">{editId ? "재생목록 수정" : "새 재생목록"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[13px]">제목 *</Label>
              <Input value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} required className="text-[13px]" placeholder="예: 투자 입문 시리즈" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px]">슬러그 (URL)</Label>
              <Input value={form.slug} onChange={(e) => setForm(f => ({ ...f, slug: e.target.value }))} placeholder="자동 생성" className="text-[13px]" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px]">설명</Label>
              <Textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} rows={2} className="text-[13px]" />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button type="button" variant="outline" size="sm" onClick={() => { setIsOpen(false); resetForm(); }} className="text-[13px]">취소</Button>
              <Button type="submit" size="sm" className="text-[13px] bg-[#2B3A4E] hover:bg-[#1e2b3a]">{editId ? "수정" : "생성"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, GripVertical } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function AdminCategories() {
  const utils = trpc.useUtils();
  const { data: categories, isLoading, error: categoriesError } = trpc.admin.listCategories.useQuery();
  const createCategory = trpc.admin.createCategory.useMutation({
    onSuccess: () => { utils.admin.listCategories.invalidate(); toast.success("카테고리가 생성되었습니다."); setIsOpen(false); resetForm(); },
    onError: (err) => toast.error(err.message || "카테고리 생성에 실패했습니다."),
  });
  const updateCategory = trpc.admin.updateCategory.useMutation({
    onSuccess: () => { utils.admin.listCategories.invalidate(); toast.success("카테고리가 수정되었습니다."); setIsOpen(false); resetForm(); },
    onError: (err) => toast.error(err.message || "카테고리 수정에 실패했습니다."),
  });
  const deleteCategory = trpc.admin.deleteCategory.useMutation({
    onSuccess: () => { utils.admin.listCategories.invalidate(); toast.success("카테고리가 삭제되었습니다."); },
    onError: (err) => toast.error(err.message || "카테고리 삭제에 실패했습니다."),
  });

  const [isOpen, setIsOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", slug: "", description: "" });

  const resetForm = () => { setForm({ name: "", slug: "", description: "" }); setEditId(null); };

  const openEdit = (item: any) => {
    setEditId(item.id);
    setForm({ name: item.name, slug: item.slug, description: item.description ?? "" });
    setIsOpen(true);
  };

  const openNew = () => { resetForm(); setIsOpen(true); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const slug = form.slug || form.name.toLowerCase().replace(/[^a-z0-9가-힣\s-]/g, "").replace(/\s+/g, "-") || `cat-${Date.now()}`;
    if (editId) {
      updateCategory.mutate({ id: editId, name: form.name, slug, description: form.description || undefined });
    } else {
      createCategory.mutate({ name: form.name, slug, description: form.description || undefined });
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">카테고리 관리</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">콘텐츠를 분류할 카테고리를 관리합니다.</p>
        </div>
        <Button size="sm" className="gap-1.5 text-[13px] bg-[#2B3A4E] hover:bg-[#1e2b3a]" onClick={openNew}>
          <Plus className="h-3.5 w-3.5" /> 카테고리 추가
        </Button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {categoriesError ? (
          <div className="p-8 text-center">
            <p className="text-sm text-red-500">데이터를 불러오는 중 오류가 발생했습니다.</p>
            <Button variant="outline" size="sm" className="mt-3 text-[13px]" onClick={() => utils.admin.listCategories.invalidate()}>다시 시도</Button>
          </div>
        ) : isLoading ? (
          <div className="p-8 text-center text-sm text-gray-400">불러오는 중...</div>
        ) : categories && categories.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/50 hover:bg-gray-50/50">
                <TableHead className="text-[12px] font-medium text-gray-500 pl-4 w-8"></TableHead>
                <TableHead className="text-[12px] font-medium text-gray-500">카테고리명</TableHead>
                <TableHead className="text-[12px] font-medium text-gray-500 hidden sm:table-cell">슬러그</TableHead>
                <TableHead className="text-[12px] font-medium text-gray-500 hidden md:table-cell">설명</TableHead>
                <TableHead className="text-[12px] font-medium text-gray-500 w-20 text-center">관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((cat) => (
                <TableRow key={cat.id} className="hover:bg-gray-50/50 group">
                  <TableCell className="pl-4 py-2.5">
                    <GripVertical className="h-3.5 w-3.5 text-gray-300" />
                  </TableCell>
                  <TableCell className="py-2.5">
                    <span className="text-[13px] font-medium text-gray-900">{cat.name}</span>
                  </TableCell>
                  <TableCell className="py-2.5 hidden sm:table-cell">
                    <span className="text-[12px] text-gray-400">/{cat.slug}</span>
                  </TableCell>
                  <TableCell className="py-2.5 hidden md:table-cell">
                    <span className="text-[12px] text-gray-400 truncate max-w-xs block">{cat.description || "-"}</span>
                  </TableCell>
                  <TableCell className="text-center py-2.5">
                    <div className="flex items-center justify-center gap-0.5">
                      <button onClick={() => openEdit(cat)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
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
                            <AlertDialogTitle>카테고리 삭제</AlertDialogTitle>
                            <AlertDialogDescription>"{cat.name}" 카테고리를 삭제하시겠습니까?</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>취소</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteCategory.mutate({ id: cat.id })}>삭제</AlertDialogAction>
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
            <p className="text-[13px] text-gray-400">아직 카테고리가 없습니다.</p>
            <Button variant="outline" size="sm" className="mt-3 text-[13px]" onClick={openNew}>
              첫 카테고리 만들기
            </Button>
          </div>
        )}
      </div>

      {/* Category Editor Dialog */}
      <Dialog open={isOpen} onOpenChange={(o) => { setIsOpen(o); if (!o) resetForm(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">{editId ? "카테고리 수정" : "새 카테고리"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[13px]">이름 *</Label>
              <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} required className="text-[13px]" placeholder="예: 투자 전략" />
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

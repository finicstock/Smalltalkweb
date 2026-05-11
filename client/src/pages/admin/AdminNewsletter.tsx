import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Send, Mail } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function AdminNewsletter() {
  const utils = trpc.useUtils();
  const { data: newsletters, isLoading } = trpc.admin.listNewsletters.useQuery();
  const createNewsletter = trpc.admin.createNewsletter.useMutation({ onSuccess: () => { utils.admin.listNewsletters.invalidate(); toast.success("뉴스레터가 생성되었습니다."); setIsOpen(false); resetForm(); } });
  const updateNewsletter = trpc.admin.updateNewsletter.useMutation({ onSuccess: () => { utils.admin.listNewsletters.invalidate(); toast.success("뉴스레터가 수정되었습니다."); setIsOpen(false); resetForm(); } });
  const deleteNewsletter = trpc.admin.deleteNewsletter.useMutation({ onSuccess: () => { utils.admin.listNewsletters.invalidate(); toast.success("뉴스레터가 삭제되었습니다."); } });
  const sendNewsletter = trpc.admin.sendNewsletter.useMutation({ onSuccess: () => { utils.admin.listNewsletters.invalidate(); toast.success("뉴스레터가 발송되었습니다."); } });

  const [isOpen, setIsOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ subject: "", body: "", recipientType: "all" as "all" | "subscribers" | "free" });

  const resetForm = () => { setForm({ subject: "", body: "", recipientType: "all" }); setEditId(null); };

  const openEdit = (item: any) => {
    setEditId(item.id);
    setForm({ subject: item.subject, body: item.body ?? "", recipientType: item.recipientType ?? "all" });
    setIsOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editId) {
      updateNewsletter.mutate({ id: editId, subject: form.subject, body: form.body, recipientType: form.recipientType });
    } else {
      createNewsletter.mutate({ subject: form.subject, body: form.body, recipientType: form.recipientType });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">뉴스레터 관리</h1>
        <Dialog open={isOpen} onOpenChange={(o) => { setIsOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> 새 뉴스레터</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editId ? "뉴스레터 수정" : "새 뉴스레터"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>제목 *</Label>
                <Input value={form.subject} onChange={(e) => setForm(f => ({ ...f, subject: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>본문 (Markdown)</Label>
                <Textarea value={form.body} onChange={(e) => setForm(f => ({ ...f, body: e.target.value }))} rows={10} className="font-mono text-sm" />
              </div>
              <div className="space-y-2">
                <Label>수신 대상</Label>
                <Select value={form.recipientType} onValueChange={(v) => setForm(f => ({ ...f, recipientType: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체 회원</SelectItem>
                    <SelectItem value="subscribers">유료 구독자만</SelectItem>
                    <SelectItem value="free">무료 회원만</SelectItem>
                  </SelectContent>
                </Select>
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
        <div className="space-y-3">{[1, 2].map(i => <Card key={i} className="animate-pulse"><CardContent className="p-4 h-16" /></Card>)}</div>
      ) : newsletters && newsletters.length > 0 ? (
        <div className="space-y-3">
          {newsletters.map((nl) => (
            <Card key={nl.id}>
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Mail className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-medium text-foreground truncate">{nl.subject}</h3>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{new Date(nl.createdAt).toLocaleDateString("ko-KR")}</span>
                      <span>{nl.recipientType === "all" ? "전체" : nl.recipientType === "subscribers" ? "유료" : "무료"}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={nl.status === "sent" ? "default" : nl.status === "scheduled" ? "secondary" : "outline"}>
                    {nl.status === "sent" ? "발송됨" : nl.status === "scheduled" ? "예약" : "초안"}
                  </Badge>
                  {nl.status === "draft" && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-1"><Send className="h-3.5 w-3.5" /> 발송</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>뉴스레터 발송</AlertDialogTitle>
                          <AlertDialogDescription>"{nl.subject}" 뉴스레터를 발송하시겠습니까?</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>취소</AlertDialogCancel>
                          <AlertDialogAction onClick={() => sendNewsletter.mutate({ id: nl.id })}>발송</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => openEdit(nl)}><Pencil className="h-4 w-4" /></Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>뉴스레터 삭제</AlertDialogTitle>
                        <AlertDialogDescription>"{nl.subject}" 뉴스레터를 삭제하시겠습니까?</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>취소</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteNewsletter.mutate({ id: nl.id })}>삭제</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card><CardContent className="p-10 text-center text-muted-foreground">아직 뉴스레터가 없습니다.</CardContent></Card>
      )}
    </div>
  );
}

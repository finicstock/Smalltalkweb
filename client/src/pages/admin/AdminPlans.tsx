import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, CreditCard, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function AdminPlans() {
  const utils = trpc.useUtils();
  const { data: plans, isLoading } = trpc.admin.listPlans.useQuery();
  const createPlan = trpc.admin.createPlan.useMutation({
    onSuccess: () => { utils.admin.listPlans.invalidate(); toast.success("플랜이 생성되었습니다."); setIsOpen(false); resetForm(); },
  });
  const updatePlan = trpc.admin.updatePlan.useMutation({
    onSuccess: () => { utils.admin.listPlans.invalidate(); toast.success("플랜이 수정되었습니다."); setIsOpen(false); resetForm(); },
  });
  const deletePlan = trpc.admin.deletePlan.useMutation({
    onSuccess: () => { utils.admin.listPlans.invalidate(); toast.success("플랜이 삭제되었습니다."); },
  });

  const [isOpen, setIsOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    priceMonthly: 0,
    priceYearly: 0,
    features: "",
    isActive: true,
    sortOrder: 0,
  });

  const resetForm = () => {
    setForm({ name: "", description: "", priceMonthly: 0, priceYearly: 0, features: "", isActive: true, sortOrder: 0 });
    setEditId(null);
  };

  const openEdit = (plan: any) => {
    setEditId(plan.id);
    const features = Array.isArray(plan.features) ? plan.features.join("\n") : (plan.features ?? "");
    setForm({
      name: plan.name,
      description: plan.description ?? "",
      priceMonthly: plan.priceMonthly,
      priceYearly: plan.priceYearly,
      features,
      isActive: plan.isActive,
      sortOrder: plan.sortOrder,
    });
    setIsOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const featuresArray = form.features.split("\n").map(f => f.trim()).filter(Boolean);
    const data = {
      name: form.name,
      description: form.description || undefined,
      priceMonthly: form.priceMonthly,
      priceYearly: form.priceYearly,
      features: featuresArray,
      isActive: form.isActive,
      sortOrder: form.sortOrder,
    };

    if (editId) {
      updatePlan.mutate({ id: editId, ...data });
    } else {
      createPlan.mutate(data);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("ko-KR").format(price) + "원";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">구독 플랜 관리</h1>
          <p className="text-sm text-muted-foreground mt-1">구독 플랜을 생성하고 관리합니다</p>
        </div>
        <Dialog open={isOpen} onOpenChange={(v) => { setIsOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> 플랜 추가</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editId ? "플랜 수정" : "새 플랜 추가"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>플랜 이름</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="예: 프리미엄" required />
              </div>
              <div>
                <Label>설명</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="플랜에 대한 간단한 설명" rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>월간 가격 (원)</Label>
                  <Input type="number" value={form.priceMonthly} onChange={(e) => setForm({ ...form, priceMonthly: parseInt(e.target.value) || 0 })} />
                </div>
                <div>
                  <Label>연간 가격 (원)</Label>
                  <Input type="number" value={form.priceYearly} onChange={(e) => setForm({ ...form, priceYearly: parseInt(e.target.value) || 0 })} />
                </div>
              </div>
              <div>
                <Label>혜택 (줄바꿈으로 구분)</Label>
                <Textarea value={form.features} onChange={(e) => setForm({ ...form, features: e.target.value })} placeholder={"모든 프리미엄 콘텐츠 열람\n주간 투자 리포트\n실시간 채팅 상담"} rows={4} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>정렬 순서</Label>
                  <Input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })} />
                </div>
                <div className="flex items-center gap-3 pt-6">
                  <Switch checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
                  <Label>활성화</Label>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => { setIsOpen(false); resetForm(); }}>취소</Button>
                <Button type="submit" disabled={createPlan.isPending || updatePlan.isPending}>
                  {editId ? "수정" : "생성"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6 space-y-4">
                <div className="h-6 bg-muted rounded w-1/3" />
                <div className="h-4 bg-muted rounded w-2/3" />
                <div className="h-8 bg-muted rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : plans && plans.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {plans.map((plan) => {
            const features = Array.isArray(plan.features) ? plan.features : [];
            return (
              <Card key={plan.id} className={`relative ${!plan.isActive ? "opacity-60" : ""}`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5 text-primary" />
                        <h3 className="text-lg font-semibold text-card-foreground">{plan.name}</h3>
                      </div>
                      {plan.description && (
                        <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
                      )}
                    </div>
                    <Badge variant={plan.isActive ? "default" : "secondary"}>
                      {plan.isActive ? "활성" : "비활성"}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">월간</p>
                      <p className="text-lg font-bold text-foreground">{formatPrice(plan.priceMonthly)}</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">연간</p>
                      <p className="text-lg font-bold text-foreground">{formatPrice(plan.priceYearly)}</p>
                    </div>
                  </div>

                  {features.length > 0 && (
                    <ul className="space-y-1.5 mb-4">
                      {(features as string[]).map((f, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="flex gap-2 pt-2 border-t">
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => openEdit(plan)}>
                      <Pencil className="h-3.5 w-3.5" /> 수정
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-1.5 text-destructive hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" /> 삭제
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>플랜 삭제</AlertDialogTitle>
                          <AlertDialogDescription>"{plan.name}" 플랜을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>취소</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deletePlan.mutate({ id: plan.id })}>삭제</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <CreditCard className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <h3 className="font-medium text-muted-foreground">아직 등록된 플랜이 없습니다</h3>
            <p className="text-sm text-muted-foreground/60 mt-1">새 플랜을 추가해 보세요.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

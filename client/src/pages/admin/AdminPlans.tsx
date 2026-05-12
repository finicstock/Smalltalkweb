import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function AdminPlans() {
  const utils = trpc.useUtils();
  const { data: plans, isLoading, error: plansError } = trpc.admin.listPlans.useQuery();
  const createPlan = trpc.admin.createPlan.useMutation({
    onSuccess: () => { utils.admin.listPlans.invalidate(); toast.success("플랜이 생성되었습니다."); setIsOpen(false); resetForm(); },
    onError: (err) => toast.error(err.message || "플랜 생성에 실패했습니다."),
  });
  const updatePlan = trpc.admin.updatePlan.useMutation({
    onSuccess: () => { utils.admin.listPlans.invalidate(); toast.success("플랜이 수정되었습니다."); setIsOpen(false); resetForm(); },
    onError: (err) => toast.error(err.message || "플랜 수정에 실패했습니다."),
  });
  const deletePlan = trpc.admin.deletePlan.useMutation({
    onSuccess: () => { utils.admin.listPlans.invalidate(); toast.success("플랜이 삭제되었습니다."); },
    onError: (err) => toast.error(err.message || "플랜 삭제에 실패했습니다."),
  });

  const [isOpen, setIsOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({
    name: "", description: "", priceMonthly: 0, priceYearly: 0, features: "", isActive: true, sortOrder: 0,
  });

  const resetForm = () => {
    setForm({ name: "", description: "", priceMonthly: 0, priceYearly: 0, features: "", isActive: true, sortOrder: 0 });
    setEditId(null);
  };

  const openEdit = (plan: any) => {
    setEditId(plan.id);
    const features = Array.isArray(plan.features) ? plan.features.join("\n") : (plan.features ?? "");
    setForm({
      name: plan.name, description: plan.description ?? "", priceMonthly: plan.priceMonthly,
      priceYearly: plan.priceYearly, features, isActive: plan.isActive, sortOrder: plan.sortOrder,
    });
    setIsOpen(true);
  };

  const openNew = () => { resetForm(); setIsOpen(true); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const featuresArray = form.features.split("\n").map(f => f.trim()).filter(Boolean);
    const data = {
      name: form.name, description: form.description || undefined, priceMonthly: form.priceMonthly,
      priceYearly: form.priceYearly, features: featuresArray, isActive: form.isActive, sortOrder: form.sortOrder,
    };
    if (editId) { updatePlan.mutate({ id: editId, ...data }); }
    else { createPlan.mutate(data); }
  };

  const formatPrice = (price: number) => new Intl.NumberFormat("ko-KR").format(price) + "원";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">구독 플랜</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">구독 상품을 설정하고 관리합니다.</p>
        </div>
        <Button size="sm" className="gap-1.5 text-[13px] bg-[#2B3A4E] hover:bg-[#1e2b3a]" onClick={openNew}>
          <Plus className="h-3.5 w-3.5" /> 플랜 추가
        </Button>
      </div>

      {plansError ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <p className="text-sm text-red-500">데이터를 불러오는 중 오류가 발생했습니다.</p>
          <Button variant="outline" size="sm" className="mt-3 text-[13px]" onClick={() => utils.admin.listPlans.invalidate()}>다시 시도</Button>
        </div>
      ) : isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-5 animate-pulse space-y-3">
              <div className="h-5 bg-gray-100 rounded w-1/3" />
              <div className="h-4 bg-gray-100 rounded w-2/3" />
              <div className="h-8 bg-gray-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : plans && plans.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {plans.map((plan) => {
            const features = Array.isArray(plan.features) ? plan.features : [];
            return (
              <div key={plan.id} className={`bg-white rounded-lg border border-gray-200 overflow-hidden ${!plan.isActive ? "opacity-60" : ""}`}>
                {/* Plan Header */}
                <div className="px-5 py-4 border-b border-gray-100">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-[15px] font-semibold text-gray-900">{plan.name}</h3>
                    <Badge
                      variant="secondary"
                      className={`text-[11px] px-2 py-0.5 font-normal ${
                        plan.isActive ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {plan.isActive ? "판매중" : "비활성"}
                    </Badge>
                  </div>
                  {plan.description && (
                    <p className="text-[12px] text-gray-500">{plan.description}</p>
                  )}
                </div>

                {/* Pricing */}
                <div className="px-5 py-3 grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 rounded-md px-3 py-2.5">
                    <p className="text-[11px] text-gray-400 mb-0.5">월간 결제</p>
                    <p className="text-[15px] font-bold text-gray-900">{formatPrice(plan.priceMonthly)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-md px-3 py-2.5">
                    <p className="text-[11px] text-gray-400 mb-0.5">연간 결제</p>
                    <p className="text-[15px] font-bold text-gray-900">{formatPrice(plan.priceYearly)}</p>
                  </div>
                </div>

                {/* Features */}
                {features.length > 0 && (
                  <div className="px-5 py-3 border-t border-gray-50">
                    <p className="text-[11px] text-gray-400 mb-2">혜택</p>
                    <ul className="space-y-1.5">
                      {(features as string[]).map((f, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-[12px] text-gray-600">
                          <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Actions */}
                <div className="px-5 py-3 border-t border-gray-100 flex gap-2">
                  <button onClick={() => openEdit(plan)} className="text-[12px] text-gray-500 hover:text-gray-700 flex items-center gap-1 transition-colors">
                    <Pencil className="h-3 w-3" /> 수정
                  </button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button className="text-[12px] text-gray-400 hover:text-red-600 flex items-center gap-1 transition-colors">
                        <Trash2 className="h-3 w-3" /> 삭제
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>플랜 삭제</AlertDialogTitle>
                        <AlertDialogDescription>"{plan.name}" 플랜을 삭제하시겠습니까?</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>취소</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deletePlan.mutate({ id: plan.id })}>삭제</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 py-16 text-center">
          <p className="text-[13px] text-gray-400">아직 등록된 플랜이 없습니다.</p>
          <Button variant="outline" size="sm" className="mt-3 text-[13px]" onClick={openNew}>
            첫 플랜 만들기
          </Button>
        </div>
      )}

      {/* Plan Editor Dialog */}
      <Dialog open={isOpen} onOpenChange={(v) => { setIsOpen(v); if (!v) resetForm(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base">{editId ? "플랜 수정" : "새 플랜 추가"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[13px]">플랜 이름 *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="예: 프리미엄" required className="text-[13px]" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px]">설명</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="플랜에 대한 간단한 설명" rows={2} className="text-[13px]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[13px]">월간 가격 (원)</Label>
                <Input type="number" value={form.priceMonthly} onChange={(e) => setForm({ ...form, priceMonthly: parseInt(e.target.value) || 0 })} className="text-[13px]" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[13px]">연간 가격 (원)</Label>
                <Input type="number" value={form.priceYearly} onChange={(e) => setForm({ ...form, priceYearly: parseInt(e.target.value) || 0 })} className="text-[13px]" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px]">혜택 (줄바꿈으로 구분)</Label>
              <Textarea value={form.features} onChange={(e) => setForm({ ...form, features: e.target.value })} placeholder={"모든 프리미엄 콘텐츠 열람\n텔레그램 채널 입장권\n주간 투자 리포트"} rows={4} className="text-[13px]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[13px]">정렬 순서</Label>
                <Input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })} className="text-[13px]" />
              </div>
              <div className="flex items-center gap-3 pt-6">
                <Switch checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
                <Label className="text-[13px]">판매 활성화</Label>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button type="button" variant="outline" size="sm" onClick={() => { setIsOpen(false); resetForm(); }} className="text-[13px]">취소</Button>
              <Button type="submit" size="sm" disabled={createPlan.isPending || updatePlan.isPending} className="text-[13px] bg-[#2B3A4E] hover:bg-[#1e2b3a]">
                {editId ? "수정" : "생성"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

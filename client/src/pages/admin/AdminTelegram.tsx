import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Send, ExternalLink, Info } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export default function AdminTelegram() {
  const utils = trpc.useUtils();
  const { data: settings, isLoading } = trpc.admin.getTelegramSettings.useQuery();
  const updateSettings = trpc.admin.updateTelegramSettings.useMutation({
    onSuccess: () => {
      utils.admin.getTelegramSettings.invalidate();
      toast.success("텔레그램 설정이 저장되었습니다.");
    },
  });

  const [form, setForm] = useState({
    inviteLink: "",
    channelName: "",
    description: "",
  });

  useEffect(() => {
    if (settings) {
      setForm({
        inviteLink: settings.inviteLink ?? "",
        channelName: settings.channelName ?? "",
        description: settings.description ?? "",
      });
    }
  }, [settings]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.inviteLink.trim()) {
      toast.error("초대 링크를 입력해 주세요.");
      return;
    }
    updateSettings.mutate({
      inviteLink: form.inviteLink.trim(),
      channelName: form.channelName.trim() || undefined,
      description: form.description.trim() || undefined,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="h-6 bg-gray-100 rounded w-40 animate-pulse" />
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4 animate-pulse">
          <div className="h-4 bg-gray-100 rounded w-1/3" />
          <div className="h-10 bg-gray-100 rounded" />
          <div className="h-10 bg-gray-100 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">텔레그램 입장권</h1>
        <p className="text-[13px] text-gray-500 mt-0.5">유료 구독자에게 제공할 텔레그램 채널 초대 링크를 설정합니다.</p>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 flex gap-2.5">
        <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
        <div className="text-[12px] text-blue-700 space-y-0.5">
          <p>유료 구독자가 마이페이지에서 텔레그램 입장 버튼을 확인할 수 있습니다.</p>
          <p>비구독자에게는 구독 유도 메시지가 표시됩니다.</p>
        </div>
      </div>

      {/* Settings Card */}
      <form onSubmit={handleSubmit}>
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <Send className="h-4 w-4 text-[#0088cc]" />
            <h2 className="text-[14px] font-semibold text-gray-900">채널 설정</h2>
          </div>

          <div className="px-5 py-5 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[13px] font-medium">초대 링크 *</Label>
              <Input
                value={form.inviteLink}
                onChange={(e) => setForm({ ...form, inviteLink: e.target.value })}
                placeholder="https://t.me/+AbCdEfGhIjK"
                required
                className="text-[13px]"
              />
              <p className="text-[11px] text-gray-400">텔레그램 채널/그룹의 초대 링크를 입력하세요.</p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[13px] font-medium">채널명</Label>
              <Input
                value={form.channelName}
                onChange={(e) => setForm({ ...form, channelName: e.target.value })}
                placeholder="닉스의 스몰톡 VIP"
                className="text-[13px]"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[13px] font-medium">안내 문구</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="구독자 전용 텔레그램 채널에서 실시간 투자 인사이트를 공유합니다."
                rows={3}
                className="text-[13px]"
              />
              <p className="text-[11px] text-gray-400">마이페이지에서 구독자에게 표시될 안내 문구입니다.</p>
            </div>
          </div>

          <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
            {settings?.inviteLink && (
              <a
                href={settings.inviteLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[12px] text-[#0088cc] hover:underline flex items-center gap-1"
              >
                <ExternalLink className="h-3 w-3" /> 현재 링크 열기
              </a>
            )}
            <div className="ml-auto">
              <Button
                type="submit"
                size="sm"
                disabled={updateSettings.isPending}
                className="text-[13px] bg-[#2B3A4E] hover:bg-[#1e2b3a]"
              >
                {updateSettings.isPending ? "저장 중..." : "설정 저장"}
              </Button>
            </div>
          </div>
        </div>
      </form>

      {/* Current Status */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h3 className="text-[13px] font-semibold text-gray-900 mb-3">현재 상태</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[11px] text-gray-400 mb-0.5">초대 링크</p>
            <p className="text-[13px] text-gray-700">
              {settings?.inviteLink ? (
                <span className="text-emerald-600">설정됨</span>
              ) : (
                <span className="text-amber-600">미설정</span>
              )}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-gray-400 mb-0.5">채널명</p>
            <p className="text-[13px] text-gray-700">{settings?.channelName || "-"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

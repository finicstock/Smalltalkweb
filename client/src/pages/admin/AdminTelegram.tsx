import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Send, ExternalLink, Copy, Check } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export default function AdminTelegram() {
  const { data: settings, isLoading } = trpc.admin.getTelegramSettings.useQuery();
  const updateMutation = trpc.admin.updateTelegramSettings.useMutation({
    onSuccess: () => {
      toast.success("텔레그램 설정이 저장되었습니다.");
    },
    onError: () => {
      toast.error("설정 저장에 실패했습니다.");
    },
  });

  const [inviteLink, setInviteLink] = useState("");
  const [channelName, setChannelName] = useState("");
  const [description, setDescription] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (settings) {
      setInviteLink(settings.inviteLink ?? "");
      setChannelName(settings.channelName ?? "");
      setDescription(settings.description ?? "");
    }
  }, [settings]);

  const handleSave = () => {
    if (!inviteLink.trim()) {
      toast.error("텔레그램 초대 링크를 입력해 주세요.");
      return;
    }
    updateMutation.mutate({ inviteLink: inviteLink.trim(), channelName: channelName.trim(), description: description.trim() });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("링크가 복사되었습니다.");
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">텔레그램 입장권</h1>
        <div className="animate-pulse space-y-4">
          <div className="h-40 bg-muted rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">텔레그램 입장권</h1>
        <p className="text-muted-foreground mt-1">유료 구독자에게 제공할 텔레그램 채널 초대 링크를 설정합니다.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            텔레그램 채널 설정
          </CardTitle>
          <CardDescription>
            유료 구독자가 마이페이지에서 확인할 수 있는 텔레그램 초대 정보를 설정하세요.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="channelName">채널/그룹 이름</Label>
            <Input
              id="channelName"
              placeholder="예: 닉스의 스몰톡 프리미엄"
              value={channelName}
              onChange={(e) => setChannelName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="inviteLink">초대 링크</Label>
            <div className="flex gap-2">
              <Input
                id="inviteLink"
                placeholder="https://t.me/+AbCdEfGhIjK"
                value={inviteLink}
                onChange={(e) => setInviteLink(e.target.value)}
              />
              {inviteLink && (
                <Button variant="outline" size="icon" onClick={handleCopy} className="shrink-0">
                  {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              텔레그램 채널/그룹의 초대 링크를 입력하세요. (t.me/+ 형식)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">안내 문구 (선택)</Label>
            <Textarea
              id="description"
              placeholder="프리미엄 구독자 전용 텔레그램 채널입니다. 실시간 투자 인사이트와 토론에 참여하세요."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <Button onClick={handleSave} disabled={updateMutation.isPending} className="gap-2">
            <Send className="h-4 w-4" />
            {updateMutation.isPending ? "저장 중..." : "설정 저장"}
          </Button>
        </CardContent>
      </Card>

      {/* Preview */}
      {inviteLink && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-base">구독자에게 보이는 미리보기</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-background rounded-lg p-6 border space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-[#0088cc]/10 flex items-center justify-center">
                  <Send className="h-6 w-6 text-[#0088cc]" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{channelName || "텔레그램 채널"}</h3>
                  <p className="text-sm text-muted-foreground">프리미엄 구독자 전용</p>
                </div>
              </div>
              {description && (
                <p className="text-sm text-muted-foreground">{description}</p>
              )}
              <Button className="gap-2 bg-[#0088cc] hover:bg-[#006699] text-white">
                <ExternalLink className="h-4 w-4" /> 텔레그램 채널 입장하기
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

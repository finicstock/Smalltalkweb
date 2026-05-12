import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileText, Crown, Send } from "lucide-react";

export default function AdminDashboard() {
  const { data: stats, isLoading } = trpc.admin.dashboard.useQuery();
  const { data: telegramSettings } = trpc.admin.getTelegramSettings.useQuery();

  const cards = [
    { title: "전체 회원", value: stats?.users ?? 0, icon: <Users className="h-5 w-5" />, color: "text-blue-600" },
    { title: "발행 콘텐츠", value: stats?.contents ?? 0, icon: <FileText className="h-5 w-5" />, color: "text-green-600" },
    { title: "유료 구독자", value: stats?.activeSubscriptions ?? 0, icon: <Crown className="h-5 w-5" />, color: "text-amber-600" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">대시보드</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{card.title}</p>
                  <p className="text-3xl font-bold text-foreground mt-1">
                    {isLoading ? "-" : card.value.toLocaleString()}
                  </p>
                </div>
                <div className={`h-12 w-12 rounded-xl bg-muted flex items-center justify-center ${card.color}`}>
                  {card.icon}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Telegram status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Send className="h-5 w-5 text-[#0088cc]" /> 텔레그램 입장권 상태
          </CardTitle>
        </CardHeader>
        <CardContent>
          {telegramSettings?.inviteLink ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{telegramSettings.channelName || "텔레그램 채널"}</span>이 설정되어 있습니다.
              </p>
              <p className="text-xs text-muted-foreground">유료 구독자에게 초대 링크가 표시됩니다.</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              아직 텔레그램 초대 링크가 설정되지 않았습니다. 좌측 메뉴의 "텔레그램 입장권"에서 설정해 주세요.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>빠른 시작 가이드</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>1. <strong className="text-foreground">카테고리 설정</strong> - 좌측 메뉴에서 카테고리를 먼저 만들어 주세요.</p>
          <p>2. <strong className="text-foreground">콘텐츠 작성</strong> - 아티클이나 영상 콘텐츠를 작성하고 발행하세요.</p>
          <p>3. <strong className="text-foreground">구독 플랜 설정</strong> - 월간/연간 구독 플랜의 가격을 설정하세요.</p>
          <p>4. <strong className="text-foreground">텔레그램 입장권</strong> - 구독자에게 제공할 텔레그램 초대 링크를 설정하세요.</p>
        </CardContent>
      </Card>
    </div>
  );
}

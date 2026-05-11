import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Crown, User } from "lucide-react";

export default function AdminSubscribers() {
  const { data: subscribers, isLoading } = trpc.admin.listSubscriptions.useQuery();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">구독자 관리</h1>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Card key={i} className="animate-pulse"><CardContent className="p-4 h-16" /></Card>)}</div>
      ) : subscribers && subscribers.length > 0 ? (
        <div className="space-y-3">
          {subscribers.map((sub) => (
            <Card key={sub.id}>
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">회원 #{sub.userId}</h3>
                    <p className="text-xs text-muted-foreground">구독 ID: {sub.id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Badge variant={sub.status === "active" ? "default" : "secondary"}>
                    {sub.status === "active" ? "활성" : sub.status === "cancelled" ? "취소" : sub.status}
                  </Badge>
                  <span className="text-muted-foreground">
                    {sub.billingCycle === "monthly" ? "월간" : "연간"}
                  </span>
                  {sub.currentPeriodEnd && (
                    <span className="text-xs text-muted-foreground">
                      ~{new Date(sub.currentPeriodEnd).toLocaleDateString("ko-KR")}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground">
            <Crown className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
            아직 유료 구독자가 없습니다.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

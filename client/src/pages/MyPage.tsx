import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { Link, useLocation } from "wouter";
import { User, Crown, CreditCard, LogOut, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export default function MyPage() {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const [, navigate] = useLocation();

  const { data: subscription } = trpc.subscription.mySubscription.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
  });

  if (loading) {
    return (
      <Layout>
        <div className="container py-10 max-w-2xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/3" />
            <div className="h-32 bg-muted rounded" />
            <div className="h-32 bg-muted rounded" />
          </div>
        </div>
      </Layout>
    );
  }

  if (!isAuthenticated) {
    return (
      <Layout>
        <div className="container py-20 text-center">
          <User className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-3">로그인이 필요합니다</h1>
          <p className="text-muted-foreground mb-6">마이페이지를 이용하려면 로그인해 주세요.</p>
          <Button onClick={() => { window.location.href = getLoginUrl(); }}>
            로그인
          </Button>
        </div>
      </Layout>
    );
  }

  const handleLogout = async () => {
    await logout();
    navigate("/");
    toast.success("로그아웃되었습니다.");
  };

  return (
    <Layout>
      <div className="container py-10 max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-foreground mb-8">마이페이지</h1>

        {/* Profile */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5" /> 프로필
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">이름</span>
              <span className="text-sm font-medium text-foreground">{user?.name ?? "-"}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">이메일</span>
              <span className="text-sm font-medium text-foreground">{user?.email ?? "-"}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">가입일</span>
              <span className="text-sm font-medium text-foreground">
                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString("ko-KR") : "-"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Subscription */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Crown className="h-5 w-5" /> 구독 상태
            </CardTitle>
          </CardHeader>
          <CardContent>
            {subscription ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">플랜</span>
                  <Badge className="bg-primary text-primary-foreground">프리미엄</Badge>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">결제 주기</span>
                  <span className="text-sm font-medium">{subscription.billingCycle === "monthly" ? "월간" : "연간"}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">상태</span>
                  <Badge variant="outline" className="text-green-600 border-green-600">활성</Badge>
                </div>
                {subscription.currentPeriodEnd && (
                  <>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">다음 결제일</span>
                      <span className="text-sm font-medium">
                        {new Date(subscription.currentPeriodEnd).toLocaleDateString("ko-KR")}
                      </span>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="text-center py-6 space-y-3">
                <p className="text-muted-foreground">현재 구독 중인 플랜이 없습니다.</p>
                <Link href="/pricing">
                  <Button className="gap-2">
                    구독하기 <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <Card>
          <CardContent className="p-4">
            <Button variant="ghost" className="w-full justify-start gap-2 text-destructive hover:text-destructive" onClick={handleLogout}>
              <LogOut className="h-4 w-4" /> 로그아웃
            </Button>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

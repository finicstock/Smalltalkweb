import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Link, useLocation } from "wouter";
import { LayoutDashboard, FileText, FolderOpen, Crown, Mail, MessageCircle, ArrowLeft, ListMusic, CreditCard, Menu } from "lucide-react";
import { useState } from "react";

const navItems = [
  { href: "/admin", label: "대시보드", icon: LayoutDashboard },
  { href: "/admin/contents", label: "콘텐츠", icon: FileText },
  { href: "/admin/categories", label: "카테고리", icon: FolderOpen },
  { href: "/admin/playlists", label: "재생목록", icon: ListMusic },
  { href: "/admin/subscribers", label: "구독자", icon: Crown },
  { href: "/admin/plans", label: "구독 플랜", icon: CreditCard },
  { href: "/admin/newsletter", label: "뉴스레터", icon: Mail },
  { href: "/admin/chat", label: "채팅 상담", icon: MessageCircle },
];

function SidebarContent({ location, onNavigate }: { location: string; onNavigate?: () => void }) {
  return (
    <>
      <div className="p-4 border-b">
        <Link href="/">
          <h2 className="font-bold text-foreground text-lg">닉스의 스몰톡</h2>
        </Link>
        <p className="text-xs text-muted-foreground mt-0.5">관리자 패널</p>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const isActive = location === item.href || (item.href !== "/admin" && location.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href} onClick={onNavigate}>
              <button className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}>
                <item.icon className="h-4 w-4" />
                {item.label}
              </button>
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t">
        <Link href="/">
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground">
            <ArrowLeft className="h-4 w-4" /> 사이트로 돌아가기
          </Button>
        </Link>
      </div>
    </>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [location] = useLocation();
  const [sheetOpen, setSheetOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">로딩 중...</div>
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">접근 권한이 없습니다</h1>
          <p className="text-muted-foreground">관리자만 접근할 수 있는 페이지입니다.</p>
          <Link href="/">
            <Button variant="outline" className="gap-2"><ArrowLeft className="h-4 w-4" /> 홈으로</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-60 bg-card border-r shrink-0 flex-col">
        <SidebarContent location={location} />
      </aside>

      {/* Mobile Top Bar + Sheet */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 border-b bg-card sticky top-0 z-40">
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-60 p-0 flex flex-col">
              <SidebarContent location={location} onNavigate={() => setSheetOpen(false)} />
            </SheetContent>
          </Sheet>
          <div>
            <h2 className="font-bold text-foreground text-sm">닉스의 스몰톡</h2>
            <p className="text-xs text-muted-foreground">관리자 패널</p>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

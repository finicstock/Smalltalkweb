import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Link, useLocation } from "wouter";
import { LayoutDashboard, FileText, FolderOpen, Crown, ArrowLeft, ListMusic, CreditCard, Menu, Send } from "lucide-react";
import { useState } from "react";

const navItems = [
  { href: "/admin", label: "대시보드", icon: LayoutDashboard },
  { href: "/admin/contents", label: "콘텐츠", icon: FileText },
  { href: "/admin/categories", label: "카테고리", icon: FolderOpen },
  { href: "/admin/playlists", label: "재생목록", icon: ListMusic },
  { href: "/admin/subscribers", label: "구독자", icon: Crown },
  { href: "/admin/plans", label: "구독 플랜", icon: CreditCard },
  { href: "/admin/telegram", label: "텔레그램 입장권", icon: Send },
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">접근 권한이 없습니다</h1>
          <p className="text-muted-foreground">관리자 계정으로 로그인해 주세요.</p>
          <Link href="/">
            <Button>홈으로 돌아가기</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-muted/30">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-60 flex-col bg-background border-r shrink-0 sticky top-0 h-screen">
        <SidebarContent location={location} />
      </aside>

      {/* Mobile Header + Sheet */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-background border-b px-4 py-3 flex items-center gap-3">
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="shrink-0">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-60 p-0 flex flex-col">
            <SidebarContent location={location} onNavigate={() => setSheetOpen(false)} />
          </SheetContent>
        </Sheet>
        <h1 className="font-semibold text-foreground text-sm truncate">관리자 패널</h1>
      </div>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 mt-14 md:mt-0 overflow-auto">
        {children}
      </main>
    </div>
  );
}

import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Link, useLocation } from "wouter";
import { PenSquare, FileText, FolderOpen, CreditCard, BarChart3, Users, Send, ArrowLeft, Menu, ChevronRight } from "lucide-react";
import { useState } from "react";

const navSections = [
  {
    items: [
      { href: "/admin/editor/new", label: "새글쓰기", icon: PenSquare, highlight: true },
    ],
  },
  {
    title: "콘텐츠",
    items: [
      { href: "/admin/contents", label: "콘텐츠 관리", icon: FileText },
      { href: "/admin/categories", label: "카테고리 관리", icon: FolderOpen },
    ],
  },
  {
    title: "구독",
    items: [
      { href: "/admin/plans", label: "구독 플랜", icon: CreditCard },
      { href: "/admin/subscribers", label: "구독자 관리", icon: Users },
      { href: "/admin/telegram", label: "텔레그램 입장권", icon: Send },
    ],
  },
  {
    title: "분석",
    items: [
      { href: "/admin", label: "통계", icon: BarChart3 },
    ],
  },
];

function SidebarContent({ location, onNavigate }: { location: string; onNavigate?: () => void }) {
  return (
    <div className="flex flex-col h-full bg-white">
      {/* Channel Header */}
      <div className="px-5 py-4 border-b border-gray-100">
        <Link href="/" onClick={onNavigate}>
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-full bg-[#2B3A4E] flex items-center justify-center">
              <span className="text-white text-xs font-bold">닉</span>
            </div>
            <div>
              <h2 className="font-semibold text-[13px] text-gray-900 leading-tight">닉스의 스몰톡</h2>
              <p className="text-[11px] text-gray-400 leading-tight">스튜디오</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2 overflow-y-auto">
        {navSections.map((section, si) => (
          <div key={si} className={si > 0 ? "mt-1" : ""}>
            {section.title && (
              <div className="px-5 py-2">
                <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">{section.title}</span>
              </div>
            )}
            {section.items.map((item) => {
              const isActive = item.href === "/admin"
                ? location === "/admin"
                : location.startsWith(item.href);
              const isHighlight = 'highlight' in item && item.highlight;

              return (
                <Link key={item.href} href={item.href} onClick={onNavigate}>
                  <div className={`
                    mx-2 px-3 py-2 rounded-md flex items-center gap-2.5 text-[13px] cursor-pointer transition-all duration-150
                    ${isHighlight && !isActive
                      ? "bg-[#2B3A4E] text-white mx-3 my-1 justify-center font-medium"
                      : isActive
                        ? "bg-gray-100 text-gray-900 font-medium"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }
                  `}>
                    <item.icon className={`h-4 w-4 shrink-0 ${isHighlight && !isActive ? "text-white" : ""}`} />
                    <span className="flex-1">{item.label}</span>
                    {isActive && !isHighlight && (
                      <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-gray-100">
        <Link href="/">
          <div className="px-3 py-2 rounded-md flex items-center gap-2.5 text-[13px] text-gray-500 hover:bg-gray-50 hover:text-gray-700 cursor-pointer transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <span>사이트로 돌아가기</span>
          </div>
        </Link>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [location] = useLocation();
  const [sheetOpen, setSheetOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin h-8 w-8 border-4 border-[#2B3A4E] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4">
          <h1 className="text-xl font-semibold text-gray-900">접근 권한이 없습니다</h1>
          <p className="text-sm text-gray-500">관리자 계정으로 로그인해 주세요.</p>
          <Link href="/">
            <Button>홈으로 돌아가기</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-[#f7f8fa]">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-56 flex-col border-r border-gray-200 bg-white shrink-0 sticky top-0 h-screen">
        <SidebarContent location={location} />
      </aside>

      {/* Mobile Header + Sheet */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="shrink-0 -ml-1">
              <Menu className="h-5 w-5 text-gray-700" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-56 p-0">
            <SidebarContent location={location} onNavigate={() => setSheetOpen(false)} />
          </SheetContent>
        </Sheet>
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-full bg-[#2B3A4E] flex items-center justify-center">
            <span className="text-white text-[10px] font-bold">닉</span>
          </div>
          <span className="font-medium text-sm text-gray-900">스튜디오</span>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 mt-14 md:mt-0 overflow-auto">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-6 md:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}

import { trpc } from "@/lib/trpc";
import { Eye, Users, Crown, FileText, TrendingUp, Send } from "lucide-react";
import { Link } from "wouter";

export default function AdminDashboard() {
  const { data: stats, isLoading, error: statsError } = trpc.admin.dashboard.useQuery();
  const { data: telegramSettings } = trpc.admin.getTelegramSettings.useQuery();
  const { data: recentContents } = trpc.admin.listContents.useQuery({ limit: 5 });

  const statCards = [
    { label: "전체 회원", value: stats?.users ?? 0, icon: Users, color: "bg-blue-50 text-blue-600" },
    { label: "발행 콘텐츠", value: stats?.contents ?? 0, icon: FileText, color: "bg-emerald-50 text-emerald-600" },
    { label: "유료 구독자", value: stats?.activeSubscriptions ?? 0, icon: Crown, color: "bg-amber-50 text-amber-600" },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-lg font-semibold text-gray-900">통계</h1>
        <p className="text-[13px] text-gray-500 mt-0.5">채널 운영 현황을 한눈에 확인하세요.</p>
      </div>

      {statsError && (
        <div className="bg-red-50 border border-red-100 rounded-lg px-4 py-3 text-[13px] text-red-600">
          통계 데이터를 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {statCards.map((card) => (
          <div key={card.label} className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[12px] text-gray-500">{card.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {isLoading ? (
                    <span className="inline-block w-12 h-7 bg-gray-100 rounded animate-pulse" />
                  ) : (
                    card.value.toLocaleString()
                  )}
                </p>
              </div>
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${card.color}`}>
                <card.icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Contents */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-[13px] font-semibold text-gray-900">최근 콘텐츠</h2>
            <Link href="/admin/contents">
              <span className="text-[12px] text-gray-400 hover:text-gray-600 cursor-pointer">전체보기 &rarr;</span>
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {!recentContents || recentContents.length === 0 ? (
              <div className="px-4 py-8 text-center text-[13px] text-gray-400">
                아직 콘텐츠가 없습니다.
              </div>
            ) : (
              recentContents.slice(0, 5).map((item) => (
                <div key={item.id} className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-gray-50/50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-gray-900 font-medium truncate">{item.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[11px] ${item.status === "published" ? "text-emerald-600" : "text-gray-400"}`}>
                        {item.status === "published" ? "발행" : "초안"}
                      </span>
                      <span className="text-[11px] text-gray-300">|</span>
                      <span className="text-[11px] text-gray-400">
                        {new Date(item.createdAt).toLocaleDateString("ko-KR")}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-[12px] text-gray-400">
                    <Eye className="h-3 w-3" />
                    {item.viewCount?.toLocaleString() ?? 0}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Status */}
        <div className="space-y-4">
          {/* Telegram Status */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Send className="h-4 w-4 text-[#0088cc]" />
              <h2 className="text-[13px] font-semibold text-gray-900">텔레그램 입장권</h2>
            </div>
            {telegramSettings?.inviteLink ? (
              <div className="space-y-1">
                <p className="text-[13px] text-gray-700">
                  <span className="font-medium">{telegramSettings.channelName || "텔레그램 채널"}</span> 설정됨
                </p>
                <p className="text-[12px] text-gray-400">유료 구독자에게 초대 링크가 표시됩니다.</p>
              </div>
            ) : (
              <div>
                <p className="text-[13px] text-gray-500 mb-2">아직 설정되지 않았습니다.</p>
                <Link href="/admin/telegram">
                  <span className="text-[12px] text-[#2B3A4E] font-medium hover:underline cursor-pointer">설정하기 &rarr;</span>
                </Link>
              </div>
            )}
          </div>

          {/* Quick Guide */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h2 className="text-[13px] font-semibold text-gray-900 mb-3">빠른 시작</h2>
            <div className="space-y-2.5">
              {[
                { step: 1, text: "카테고리를 만들어 콘텐츠를 분류하세요", href: "/admin/categories" },
                { step: 2, text: "첫 콘텐츠를 작성하고 발행하세요", href: "/admin/contents/new" },
                { step: 3, text: "구독 플랜의 가격을 설정하세요", href: "/admin/plans" },
                { step: 4, text: "텔레그램 초대 링크를 등록하세요", href: "/admin/telegram" },
              ].map((item) => (
                <Link key={item.step} href={item.href}>
                  <div className="flex items-start gap-2.5 group cursor-pointer">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-gray-100 text-[11px] font-medium text-gray-500 flex items-center justify-center mt-0.5">
                      {item.step}
                    </span>
                    <p className="text-[13px] text-gray-600 group-hover:text-gray-900 transition-colors">{item.text}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

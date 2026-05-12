import { trpc } from "@/lib/trpc";
import { Eye, Users, Crown, FileText, TrendingUp, BarChart2, ArrowUpRight, Send } from "lucide-react";
import { Link } from "wouter";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

function formatDate(d: Date | string) {
  const dt = typeof d === "string" ? new Date(d) : d;
  return `${dt.getMonth() + 1}/${dt.getDate()}`;
}

export default function AdminDashboard() {
  const { data: stats, isLoading } = trpc.admin.dashboard.useQuery();
  const { data: extStats } = trpc.stats.dashboard.useQuery();
  const { data: dailyViews } = trpc.stats.dailyViews.useQuery({ days: 30 });
  const { data: topContents } = trpc.stats.topContents.useQuery({ limit: 10 });
  const { data: conversionRate } = trpc.stats.conversionRate.useQuery();
  const { data: telegramSettings } = trpc.admin.getTelegramSettings.useQuery();
  const { data: recentContents } = trpc.admin.listContents.useQuery({ limit: 5 });

  const chartData = (dailyViews ?? []).map((row) => ({
    date: formatDate(row.date as Date | string),
    views: Number(row.views ?? 0),
  }));

  const statCards = [
    { label: "전체 회원", value: extStats?.totalUsers ?? stats?.users ?? 0, icon: Users, color: "bg-blue-50 text-blue-600" },
    { label: "발행 콘텐츠", value: extStats?.publishedContents ?? stats?.contents ?? 0, icon: FileText, color: "bg-emerald-50 text-emerald-600" },
    { label: "유료 구독자", value: extStats?.activeSubscriptions ?? stats?.activeSubscriptions ?? 0, icon: Crown, color: "bg-amber-50 text-amber-600" },
    { label: "총 조회수", value: extStats?.totalViews ?? 0, icon: Eye, color: "bg-purple-50 text-purple-600" },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-lg font-semibold text-gray-900">통계</h1>
        <p className="text-[13px] text-gray-500 mt-0.5">채널 운영 현황을 한눈에 확인하세요.</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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

      {/* Conversion Rate */}
      {conversionRate && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[13px] font-semibold text-gray-900 flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              구독 전환율
            </h2>
            <span className="text-xl font-bold text-emerald-600">{conversionRate.rate}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div
              className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(conversionRate.rate, 100)}%` }}
            />
          </div>
          <div className="flex justify-between mt-1.5 text-[11px] text-gray-400">
            <span>전체 회원 {conversionRate.total.toLocaleString()}명</span>
            <span>유료 구독 {conversionRate.paid.toLocaleString()}명</span>
          </div>
        </div>
      )}

      {/* Daily Views Chart */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-1.5 mb-4">
          <BarChart2 className="h-4 w-4 text-blue-500" />
          <h2 className="text-[13px] font-semibold text-gray-900">최근 30일 조회수 추이</h2>
        </div>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
                formatter={(value: number) => [value.toLocaleString(), "조회수"]}
              />
              <Area type="monotone" dataKey="views" stroke="#3b82f6" strokeWidth={2} fill="url(#viewsGradient)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[200px] flex items-center justify-center text-[13px] text-gray-400">
            아직 조회 데이터가 없습니다.
          </div>
        )}
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top 10 Contents */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4 text-amber-500" />
            <h2 className="text-[13px] font-semibold text-gray-900">인기 콘텐츠 TOP 10</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {(topContents ?? []).length === 0 ? (
              <p className="px-4 py-6 text-[13px] text-gray-400 text-center">데이터가 없습니다.</p>
            ) : (
              (topContents ?? []).map((item: any, idx: number) => (
                <div key={item.id} className="flex items-center gap-3 px-4 py-2.5">
                  <span className={`text-[12px] font-bold w-5 text-center ${idx < 3 ? "text-amber-500" : "text-gray-300"}`}>
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-gray-800 truncate">{item.title}</p>
                  </div>
                  <span className="text-[12px] text-gray-400 flex items-center gap-0.5">
                    <Eye className="h-3 w-3" />
                    {Number(item.totalViews ?? 0).toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Contents + Quick Status */}
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-[13px] font-semibold text-gray-900">최근 콘텐츠</h2>
              <Link href="/admin/contents">
                <span className="text-[12px] text-gray-400 hover:text-gray-600 cursor-pointer flex items-center gap-0.5">
                  전체보기 <ArrowUpRight className="h-3 w-3" />
                </span>
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
        </div>
      </div>
    </div>
  );
}

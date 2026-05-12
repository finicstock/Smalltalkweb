import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Crown, User } from "lucide-react";

export default function AdminSubscribers() {
  const { data: subscribers, isLoading, error: subscribersError } = trpc.admin.listSubscriptions.useQuery();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">구독자 관리</h1>
        <p className="text-[13px] text-gray-500 mt-0.5">유료 구독자 현황을 확인합니다.</p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {subscribersError ? (
          <div className="p-8 text-center">
            <p className="text-sm text-red-500">데이터를 불러오는 중 오류가 발생했습니다.</p>
          </div>
        ) : isLoading ? (
          <div className="p-8 text-center text-sm text-gray-400">불러오는 중...</div>
        ) : subscribers && subscribers.length > 0 ? (
          <>
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
              <p className="text-[12px] text-gray-500">총 <span className="font-medium text-gray-700">{subscribers.length}</span>명</p>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/50 hover:bg-gray-50/50">
                  <TableHead className="text-[12px] font-medium text-gray-500 pl-4">회원</TableHead>
                  <TableHead className="text-[12px] font-medium text-gray-500 w-24 text-center">구독 상태</TableHead>
                  <TableHead className="text-[12px] font-medium text-gray-500 w-24 text-center">결제 주기</TableHead>
                  <TableHead className="text-[12px] font-medium text-gray-500 w-28 text-center hidden sm:table-cell">만료일</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscribers.map((sub) => (
                  <TableRow key={sub.id} className="hover:bg-gray-50/50">
                    <TableCell className="pl-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                          <User className="h-4 w-4 text-gray-400" />
                        </div>
                        <div>
                          <p className="text-[13px] font-medium text-gray-900">회원 #{sub.userId}</p>
                          <p className="text-[11px] text-gray-400">ID: {sub.id}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="secondary"
                        className={`text-[11px] px-2 py-0.5 font-normal ${
                          sub.status === "active"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-gray-100 text-gray-500 border-gray-200"
                        }`}
                      >
                        {sub.status === "active" ? "활성" : sub.status === "cancelled" ? "취소" : sub.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-[12px] text-gray-600">
                        {sub.billingCycle === "monthly" ? "월간" : "연간"}
                      </span>
                    </TableCell>
                    <TableCell className="text-center hidden sm:table-cell">
                      <span className="text-[12px] text-gray-400">
                        {sub.currentPeriodEnd
                          ? new Date(sub.currentPeriodEnd).toLocaleDateString("ko-KR")
                          : "-"}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        ) : (
          <div className="py-16 text-center">
            <Crown className="h-10 w-10 text-gray-200 mx-auto mb-3" />
            <p className="text-[13px] text-gray-400">아직 유료 구독자가 없습니다.</p>
            <p className="text-[12px] text-gray-300 mt-1">구독 플랜을 설정하고 콘텐츠를 발행해 보세요.</p>
          </div>
        )}
      </div>
    </div>
  );
}

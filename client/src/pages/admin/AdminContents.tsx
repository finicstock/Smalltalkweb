import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Pencil, Trash2, Eye, Lock, Globe, Search, PenSquare } from "lucide-react";
import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

type StatusFilter = "all" | "published" | "draft" | "archived";

export default function AdminContents() {
  const utils = trpc.useUtils();
  const { data: contents, isLoading, error: contentsError } = trpc.admin.listContents.useQuery({ limit: 100 });
  const deleteContent = trpc.admin.deleteContent.useMutation({
    onSuccess: () => { utils.admin.listContents.invalidate(); toast.success("콘텐츠가 삭제되었습니다."); },
    onError: (err) => toast.error(err.message || "콘텐츠 삭제에 실패했습니다."),
  });

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [, navigate] = useLocation();

  const filteredContents = useMemo(() => {
    if (!contents) return [];
    let filtered = contents;
    if (statusFilter !== "all") {
      filtered = filtered.filter((c) => c.status === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((c) => c.title.toLowerCase().includes(q));
    }
    return filtered;
  }, [contents, statusFilter, searchQuery]);

  const statusCounts = useMemo(() => {
    if (!contents) return { all: 0, published: 0, draft: 0, archived: 0 };
    return {
      all: contents.length,
      published: contents.filter((c) => c.status === "published").length,
      draft: contents.filter((c) => c.status === "draft").length,
      archived: contents.filter((c) => c.status === "archived").length,
    };
  }, [contents]);

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">콘텐츠 관리</h1>
        <Button
          size="sm"
          className="gap-1.5 text-[13px] bg-[#2B3A4E] hover:bg-[#1e2b3a]"
          onClick={() => navigate("/admin/editor/new")}
        >
          <PenSquare className="h-3.5 w-3.5" /> 새글쓰기
        </Button>
      </div>

      {/* Status Tabs + Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <TabsList className="bg-transparent p-0 h-auto gap-0 border-b border-gray-200 rounded-none w-full sm:w-auto">
            {[
              { value: "all", label: "전체", count: statusCounts.all },
              { value: "published", label: "발행", count: statusCounts.published },
              { value: "draft", label: "초안", count: statusCounts.draft },
              { value: "archived", label: "보관", count: statusCounts.archived },
            ].map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#2B3A4E] data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-[13px] text-gray-500 data-[state=active]:text-gray-900 data-[state=active]:font-medium"
              >
                {tab.label} <span className="ml-1 text-gray-400">{tab.count}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <Input
            placeholder="제목 검색"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-[13px] w-full sm:w-52 bg-white border-gray-200"
          />
        </div>
      </div>

      {/* Content Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {contentsError ? (
          <div className="p-8 text-center">
            <p className="text-sm text-red-500">데이터를 불러오는 중 오류가 발생했습니다.</p>
            <Button variant="outline" size="sm" className="mt-3 text-[13px]" onClick={() => utils.admin.listContents.invalidate()}>다시 시도</Button>
          </div>
        ) : isLoading ? (
          <div className="p-8 text-center text-sm text-gray-400">불러오는 중...</div>
        ) : filteredContents.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/80 hover:bg-gray-50/80">
                <TableHead className="text-[12px] font-medium text-gray-500 pl-4">제목</TableHead>
                <TableHead className="text-[12px] font-medium text-gray-500 w-20 text-center">상태</TableHead>
                <TableHead className="text-[12px] font-medium text-gray-500 w-20 text-center">접근</TableHead>
                <TableHead className="text-[12px] font-medium text-gray-500 w-20 text-center hidden sm:table-cell">조회수</TableHead>
                <TableHead className="text-[12px] font-medium text-gray-500 w-24 text-center hidden md:table-cell">작성일</TableHead>
                <TableHead className="text-[12px] font-medium text-gray-500 w-20 text-center">관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContents.map((item) => (
                <TableRow key={item.id} className="hover:bg-gray-50/50 group">
                  <TableCell className="pl-4 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-[13px] text-gray-900 font-medium truncate max-w-xs cursor-pointer hover:text-[#2B3A4E]"
                        onClick={() => navigate(`/admin/editor/${item.id}`)}
                      >
                        {item.title}
                      </span>
                      {item.contentType === "video" && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-blue-200 text-blue-600 bg-blue-50">영상</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant={item.status === "published" ? "default" : "secondary"}
                      className={`text-[11px] px-2 py-0.5 font-normal ${
                        item.status === "published"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                          : item.status === "draft"
                            ? "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50"
                            : "bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-100"
                      }`}
                    >
                      {item.status === "published" ? "발행" : item.status === "draft" ? "초안" : "보관"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {item.accessLevel === "paid" ? (
                      <span className="inline-flex items-center gap-0.5 text-[11px] text-amber-600">
                        <Lock className="h-3 w-3" /> 유료
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-0.5 text-[11px] text-gray-500">
                        <Globe className="h-3 w-3" /> 무료
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-center hidden sm:table-cell">
                    <span className="text-[12px] text-gray-500 flex items-center justify-center gap-0.5">
                      <Eye className="h-3 w-3" /> {item.viewCount?.toLocaleString() ?? 0}
                    </span>
                  </TableCell>
                  <TableCell className="text-center hidden md:table-cell">
                    <span className="text-[12px] text-gray-400">
                      {new Date(item.createdAt).toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" })}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-0.5">
                      <button
                        onClick={() => navigate(`/admin/editor/${item.id}`)}
                        className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>콘텐츠 삭제</AlertDialogTitle>
                            <AlertDialogDescription>"{item.title}"을(를) 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>취소</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteContent.mutate({ id: item.id })}>삭제</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="py-16 text-center">
            <p className="text-sm text-gray-400">
              {searchQuery ? "검색 결과가 없습니다." : "아직 콘텐츠가 없습니다."}
            </p>
            {!searchQuery && (
              <Button
                variant="outline"
                size="sm"
                className="mt-3 text-[13px]"
                onClick={() => navigate("/admin/editor/new")}
              >
                첫 콘텐츠 작성하기
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Bottom info */}
      {filteredContents.length > 0 && (
        <p className="text-[12px] text-gray-400">총 {filteredContents.length}건</p>
      )}
    </div>
  );
}

import { trpc } from "@/lib/trpc";
import { sanitizeHtml } from "@/lib/sanitizeHtml";
import { useMemo } from "react";
import { useRoute } from "wouter";

export default function PreviewPage() {
  const [, params] = useRoute("/preview/:token");
  const token = params?.token || "";
  const { data: content, isLoading, error } = trpc.content.getByPreviewToken.useQuery(
    { token },
    { enabled: !!token }
  );
  const safeBody = useMemo(() => sanitizeHtml(content?.body || ""), [content?.body]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-gray-300 border-t-gray-900 rounded-full" />
      </div>
    );
  }

  if (error || !content) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">미리보기를 찾을 수 없습니다</h1>
          <p className="text-gray-500">링크가 만료되었거나 유효하지 않습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Preview Banner */}
      <div className="bg-amber-50 border-b border-amber-200 py-2 px-4 text-center">
        <span className="text-[13px] text-amber-800 font-medium">
          미리보기 모드 — 이 콘텐츠는 아직 발행되지 않았습니다
        </span>
      </div>

      <div className="max-w-[720px] mx-auto px-6 py-10">
        {content.thumbnailUrl && (
          <div className="mb-6 rounded-lg overflow-hidden">
            <img src={content.thumbnailUrl} alt="썸네일" className="w-full h-48 object-cover" />
          </div>
        )}
        <h1 className="text-3xl font-bold text-gray-900 mb-3">{content.title}</h1>
        {content.excerpt && <p className="text-gray-500 text-base mb-6">{content.excerpt}</p>}
        <div className="flex items-center gap-3 text-sm text-gray-400 mb-8 pb-6 border-b border-gray-100">
          <span>닉스의 스몰톡</span>
          <span>·</span>
          <span>{new Date(content.createdAt).toLocaleDateString("ko-KR")}</span>
        </div>
        <div
          className="content-body prose prose-lg max-w-none"
          dangerouslySetInnerHTML={{ __html: safeBody }}
        />
      </div>
    </div>
  );
}

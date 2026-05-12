import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Link from "@tiptap/extension-link";
import {
  ArrowLeft, Save, Send, Eye, Image as ImageIcon, Video, Minus, Link as LinkIcon,
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, AlignLeft, AlignCenter,
  AlignRight, Heading1, Heading2, Heading3, List, ListOrdered, Quote, Code,
  Lock, ChevronRight, X, Upload
} from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation, useRoute } from "wouter";
import { toast } from "sonner";

// ─── Paywall Divider Extension ───────────────────────────
// Paywall marker (visual only, actual paywall is handled by accessLevel)

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim() || `content-${Date.now()}`;
}

type EditorStep = "type" | "edit" | "publish";

export default function AdminContentEditor() {
  const [, navigate] = useLocation();
  const [, params] = useRoute("/admin/editor/:id");
  const editId = params?.id && params.id !== "new" ? parseInt(params.id) : null;

  const utils = trpc.useUtils();
  const { data: categories } = trpc.admin.listCategories.useQuery();
  const { data: existingContent } = trpc.admin.listContents.useQuery(
    { limit: 100 },
    { enabled: !!editId }
  );

  const createContent = trpc.admin.createContent.useMutation({
    onSuccess: () => { utils.admin.listContents.invalidate(); toast.success("콘텐츠가 발행되었습니다."); navigate("/admin/contents"); },
    onError: (err) => toast.error(err.message || "콘텐츠 생성에 실패했습니다."),
  });
  const updateContent = trpc.admin.updateContent.useMutation({
    onSuccess: () => { utils.admin.listContents.invalidate(); toast.success("콘텐츠가 수정되었습니다."); navigate("/admin/contents"); },
    onError: (err) => toast.error(err.message || "콘텐츠 수정에 실패했습니다."),
  });

  // ─── State ───────────────────────────
  const [step, setStep] = useState<EditorStep>(editId ? "edit" : "type");
  const [contentType, setContentType] = useState<"article" | "video">("article");
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [slug, setSlug] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [accessLevel, setAccessLevel] = useState<"free" | "paid">("free");
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [categoryId, setCategoryId] = useState("");
  const [paywallPosition, setPaywallPosition] = useState<number | null>(null);
  const [showPublishPanel, setShowPublishPanel] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Tiptap Editor ───────────────────────────
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Image.configure({ inline: false, allowBase64: true }),
      Placeholder.configure({ placeholder: "본문을 작성하세요..." }),
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Link.configure({ openOnClick: false }),
    ],
    content: "",
    editorProps: {
      attributes: {
        class: "prose prose-lg max-w-none focus:outline-none min-h-[400px] px-0 py-4",
      },
    },
  });

  // Load existing content for editing
  useEffect(() => {
    if (editId && existingContent) {
      const item = existingContent.find((c) => c.id === editId);
      if (item) {
        setContentType(item.contentType as "article" | "video");
        setTitle(item.title);
        setExcerpt(item.excerpt ?? "");
        setSlug(item.slug);
        setVideoUrl(item.videoUrl ?? "");
        setAccessLevel(item.accessLevel as "free" | "paid");
        setStatus(item.status === "archived" ? "draft" : item.status as "draft" | "published");
        setCategoryId(item.categoryId?.toString() ?? "");
        // Convert markdown body to HTML for tiptap
        if (item.body && editor) {
          // Simple markdown to HTML conversion for loading
          const html = markdownToHtml(item.body);
          editor.commands.setContent(html);
        }
      }
    }
  }, [editId, existingContent, editor]);

  // ─── Image Upload ───────────────────────────
  const uploadImage = useCallback(async (file: File) => {
    setIsUploading(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      // Upload via tRPC
      const result = await utils.client.admin.uploadImage.mutate({
        filename: file.name,
        data: base64,
        contentType: file.type,
      });

      if (result?.url && editor) {
        editor.chain().focus().setImage({ src: result.url }).run();
      }
    } catch (err: any) {
      toast.error("이미지 업로드에 실패했습니다.");
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  }, [editor, utils]);

  const handleImageSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("이미지 크기는 10MB 이하여야 합니다.");
        return;
      }
      uploadImage(file);
    }
    e.target.value = "";
  };

  // ─── Paywall Insert ───────────────────────────
  const insertPaywall = () => {
    if (!editor) return;
    editor.chain().focus().setHorizontalRule().run();
    setPaywallPosition(editor.state.selection.from);
    setAccessLevel("paid");
    toast.success("페이월이 삽입되었습니다. 이 구분선 아래는 유료 구독자만 볼 수 있습니다.");
  };

  // ─── Link Insert ───────────────────────────
  const insertLink = () => {
    if (!editor) return;
    const url = window.prompt("링크 URL을 입력하세요:");
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  // ─── Submit ───────────────────────────
  const handleSave = (publishStatus: "draft" | "published") => {
    if (!title.trim()) {
      toast.error("제목을 입력해주세요.");
      return;
    }

    const body = editor ? htmlToMarkdown(editor.getHTML()) : "";
    const data = {
      title: title.trim(),
      slug: slug || slugify(title),
      excerpt: excerpt || undefined,
      body: body || undefined,
      contentType,
      videoUrl: videoUrl || undefined,
      accessLevel,
      status: publishStatus,
      categoryId: categoryId && categoryId !== "none" ? parseInt(categoryId) : undefined,
    };

    if (editId) {
      updateContent.mutate({ id: editId, ...data });
    } else {
      createContent.mutate(data);
    }
  };

  // ─── STEP 1: Content Type Selection ───────────────────────────
  if (step === "type") {
    return (
      <div className="min-h-screen bg-white">
        <div className="border-b border-gray-200 bg-white sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-6 h-14 flex items-center">
            <button onClick={() => navigate("/admin/contents")} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
              <ArrowLeft className="h-4 w-4" /> 돌아가기
            </button>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-6 py-20">
          <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">새글쓰기</h1>
          <p className="text-sm text-gray-500 text-center mb-12">콘텐츠 유형을 선택해 주세요.</p>

          <div className="grid grid-cols-2 gap-6">
            <button
              onClick={() => { setContentType("article"); setStep("edit"); }}
              className="group p-8 border-2 border-gray-200 rounded-xl hover:border-[#2B3A4E] hover:bg-gray-50/50 transition-all text-center"
            >
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-xl flex items-center justify-center group-hover:bg-[#2B3A4E]/10">
                <span className="text-3xl">T</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">텍스트</h3>
              <p className="text-xs text-gray-500">글, 이미지, 파일 등을 활용한<br />텍스트 기반 콘텐츠</p>
            </button>

            <button
              onClick={() => { setContentType("video"); setStep("edit"); }}
              className="group p-8 border-2 border-gray-200 rounded-xl hover:border-[#2B3A4E] hover:bg-gray-50/50 transition-all text-center"
            >
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-xl flex items-center justify-center group-hover:bg-[#2B3A4E]/10">
                <Video className="h-8 w-8 text-gray-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">동영상</h3>
              <p className="text-xs text-gray-500">영상이 주된 콘텐츠인<br />동영상 기반 콘텐츠</p>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── STEP 2 & 3: Editor + Publish Panel ───────────────────────────
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Top Bar */}
      <div className="border-b border-gray-200 bg-white sticky top-0 z-20">
        <div className="max-w-[1200px] mx-auto px-6 h-14 flex items-center justify-between">
          <button onClick={() => navigate("/admin/contents")} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
            <ArrowLeft className="h-4 w-4" /> 콘텐츠 관리
          </button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-[13px] gap-1.5"
              onClick={() => handleSave("draft")}
              disabled={createContent.isPending || updateContent.isPending}
            >
              <Save className="h-3.5 w-3.5" /> 임시저장
            </Button>
            <Button
              size="sm"
              className="text-[13px] gap-1.5 bg-[#2B3A4E] hover:bg-[#1e2b3a]"
              onClick={() => setShowPublishPanel(true)}
            >
              <Send className="h-3.5 w-3.5" /> 발행하기
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Main Editor Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-6 py-8">
            {/* Title Input */}
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="제목을 입력하세요"
              className="w-full text-[32px] font-bold text-gray-900 placeholder:text-gray-300 border-none outline-none bg-transparent mb-6 leading-tight"
            />

            {/* Video URL for video type */}
            {contentType === "video" && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <Label className="text-[13px] text-gray-600 mb-2 block">영상 URL (YouTube)</Label>
                <Input
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="text-[13px]"
                />
              </div>
            )}

            {/* Toolbar */}
            <div className="sticky top-14 z-10 bg-white border-b border-gray-200 -mx-6 px-6 py-2 mb-4">
              <div className="flex items-center gap-0.5 flex-wrap">
                <ToolbarButton icon={Heading1} label="제목1" onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} active={editor?.isActive("heading", { level: 1 })} />
                <ToolbarButton icon={Heading2} label="제목2" onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} active={editor?.isActive("heading", { level: 2 })} />
                <ToolbarButton icon={Heading3} label="제목3" onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()} active={editor?.isActive("heading", { level: 3 })} />
                <ToolbarSeparator />
                <ToolbarButton icon={Bold} label="굵게" onClick={() => editor?.chain().focus().toggleBold().run()} active={editor?.isActive("bold")} />
                <ToolbarButton icon={Italic} label="기울임" onClick={() => editor?.chain().focus().toggleItalic().run()} active={editor?.isActive("italic")} />
                <ToolbarButton icon={UnderlineIcon} label="밑줄" onClick={() => editor?.chain().focus().toggleUnderline().run()} active={editor?.isActive("underline")} />
                <ToolbarButton icon={Strikethrough} label="취소선" onClick={() => editor?.chain().focus().toggleStrike().run()} active={editor?.isActive("strike")} />
                <ToolbarSeparator />
                <ToolbarButton icon={AlignLeft} label="왼쪽" onClick={() => editor?.chain().focus().setTextAlign("left").run()} active={editor?.isActive({ textAlign: "left" })} />
                <ToolbarButton icon={AlignCenter} label="가운데" onClick={() => editor?.chain().focus().setTextAlign("center").run()} active={editor?.isActive({ textAlign: "center" })} />
                <ToolbarButton icon={AlignRight} label="오른쪽" onClick={() => editor?.chain().focus().setTextAlign("right").run()} active={editor?.isActive({ textAlign: "right" })} />
                <ToolbarSeparator />
                <ToolbarButton icon={List} label="목록" onClick={() => editor?.chain().focus().toggleBulletList().run()} active={editor?.isActive("bulletList")} />
                <ToolbarButton icon={ListOrdered} label="번호목록" onClick={() => editor?.chain().focus().toggleOrderedList().run()} active={editor?.isActive("orderedList")} />
                <ToolbarButton icon={Quote} label="인용" onClick={() => editor?.chain().focus().toggleBlockquote().run()} active={editor?.isActive("blockquote")} />
                <ToolbarButton icon={Code} label="코드" onClick={() => editor?.chain().focus().toggleCodeBlock().run()} active={editor?.isActive("codeBlock")} />
                <ToolbarSeparator />
                <ToolbarButton icon={ImageIcon} label="이미지" onClick={handleImageSelect} />
                <ToolbarButton icon={LinkIcon} label="링크" onClick={insertLink} active={editor?.isActive("link")} />
                <ToolbarButton icon={Minus} label="구분선" onClick={() => editor?.chain().focus().setHorizontalRule().run()} />
                <ToolbarSeparator />
                <button
                  onClick={insertPaywall}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-[12px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-md hover:bg-amber-100 transition-colors"
                >
                  <Lock className="h-3 w-3" /> 페이월
                </button>
              </div>
            </div>

            {/* Editor Content */}
            {isUploading && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-[13px] text-blue-700 flex items-center gap-2">
                <Upload className="h-4 w-4 animate-pulse" /> 이미지 업로드 중...
              </div>
            )}
            <EditorContent editor={editor} className="editor-content" />

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        </div>

        {/* Publish Panel (Slide-in) */}
        {showPublishPanel && (
          <div className="w-[360px] border-l border-gray-200 bg-gray-50 overflow-y-auto flex-shrink-0">
            <div className="p-5">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-base font-semibold text-gray-900">발행 설정</h2>
                <button onClick={() => setShowPublishPanel(false)} className="p-1 rounded hover:bg-gray-200">
                  <X className="h-4 w-4 text-gray-500" />
                </button>
              </div>

              <div className="space-y-5">
                {/* Slug */}
                <div className="space-y-1.5">
                  <Label className="text-[13px] text-gray-700">URL 슬러그</Label>
                  <Input
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder={slugify(title) || "자동 생성"}
                    className="text-[13px] bg-white"
                  />
                </div>

                {/* Excerpt */}
                <div className="space-y-1.5">
                  <Label className="text-[13px] text-gray-700">요약문</Label>
                  <Textarea
                    value={excerpt}
                    onChange={(e) => setExcerpt(e.target.value)}
                    placeholder="콘텐츠 목록에 표시될 요약문"
                    rows={3}
                    className="text-[13px] bg-white resize-none"
                  />
                </div>

                {/* Category */}
                <div className="space-y-1.5">
                  <Label className="text-[13px] text-gray-700">카테고리</Label>
                  <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger className="text-[13px] bg-white"><SelectValue placeholder="선택" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">없음</SelectItem>
                      {categories?.map((c) => (
                        <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Access Level */}
                <div className="space-y-1.5">
                  <Label className="text-[13px] text-gray-700">판매 설정</Label>
                  <Select value={accessLevel} onValueChange={(v) => setAccessLevel(v as "free" | "paid")}>
                    <SelectTrigger className="text-[13px] bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">무료 공개</SelectItem>
                      <SelectItem value="paid">구독자 전용 (유료)</SelectItem>
                    </SelectContent>
                  </Select>
                  {accessLevel === "paid" && (
                    <p className="text-[11px] text-amber-600 mt-1">
                      본문에 페이월을 삽입하면, 그 위까지만 무료로 공개됩니다.
                    </p>
                  )}
                </div>

                <Separator />

                {/* Action Buttons */}
                <div className="space-y-2">
                  <Button
                    className="w-full text-[13px] bg-[#2B3A4E] hover:bg-[#1e2b3a]"
                    onClick={() => handleSave("published")}
                    disabled={createContent.isPending || updateContent.isPending}
                  >
                    <Send className="h-3.5 w-3.5 mr-1.5" />
                    {editId ? "수정 발행" : "발행하기"}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full text-[13px]"
                    onClick={() => handleSave("draft")}
                    disabled={createContent.isPending || updateContent.isPending}
                  >
                    <Save className="h-3.5 w-3.5 mr-1.5" />
                    임시저장
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Editor Styles */}
      <style>{`
        .editor-content .tiptap {
          min-height: 400px;
          font-size: 16px;
          line-height: 1.8;
          color: #1a1a1a;
        }
        .editor-content .tiptap p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #adb5bd;
          pointer-events: none;
          height: 0;
        }
        .editor-content .tiptap h1 { font-size: 28px; font-weight: 700; margin: 1.5em 0 0.5em; }
        .editor-content .tiptap h2 { font-size: 22px; font-weight: 600; margin: 1.3em 0 0.4em; }
        .editor-content .tiptap h3 { font-size: 18px; font-weight: 600; margin: 1.2em 0 0.3em; }
        .editor-content .tiptap p { margin: 0.8em 0; }
        .editor-content .tiptap img { max-width: 100%; height: auto; border-radius: 8px; margin: 1em 0; }
        .editor-content .tiptap blockquote {
          border-left: 3px solid #e5e7eb;
          padding-left: 1em;
          margin: 1em 0;
          color: #6b7280;
        }
        .editor-content .tiptap hr {
          border: none;
          border-top: 2px dashed #e5e7eb;
          margin: 2em 0;
        }
        .editor-content .tiptap ul, .editor-content .tiptap ol {
          padding-left: 1.5em;
          margin: 0.8em 0;
        }
        .editor-content .tiptap code {
          background: #f3f4f6;
          padding: 0.2em 0.4em;
          border-radius: 4px;
          font-size: 0.9em;
        }
        .editor-content .tiptap pre {
          background: #1e293b;
          color: #e2e8f0;
          padding: 1em;
          border-radius: 8px;
          overflow-x: auto;
          margin: 1em 0;
        }
        .editor-content .tiptap a { color: #2563eb; text-decoration: underline; }
      `}</style>
    </div>
  );
}

// ─── Toolbar Components ───────────────────────────
function ToolbarButton({ icon: Icon, label, onClick, active }: { icon: any; label: string; onClick: () => void; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`p-1.5 rounded transition-colors ${active ? "bg-gray-200 text-gray-900" : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"}`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function ToolbarSeparator() {
  return <div className="w-px h-5 bg-gray-200 mx-1" />;
}

// ─── Markdown <-> HTML Conversion ───────────────────────────
function markdownToHtml(md: string): string {
  if (!md) return "";
  let html = md;
  // Headers
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");
  // Bold & Italic
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  // Images
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />');
  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  // Horizontal rules
  html = html.replace(/^---$/gm, "<hr>");
  // Line breaks → paragraphs
  const paragraphs = html.split(/\n\n+/).filter(Boolean);
  html = paragraphs.map((p) => {
    if (p.startsWith("<h") || p.startsWith("<hr") || p.startsWith("<img")) return p;
    if (p.startsWith("- ")) {
      const items = p.split("\n").map((l) => `<li>${l.replace(/^- /, "")}</li>`).join("");
      return `<ul>${items}</ul>`;
    }
    if (/^\d+\. /.test(p)) {
      const items = p.split("\n").map((l) => `<li>${l.replace(/^\d+\. /, "")}</li>`).join("");
      return `<ol>${items}</ol>`;
    }
    if (p.startsWith("> ")) {
      return `<blockquote><p>${p.replace(/^> /gm, "")}</p></blockquote>`;
    }
    return `<p>${p.replace(/\n/g, "<br>")}</p>`;
  }).join("");
  return html;
}

function htmlToMarkdown(html: string): string {
  if (!html) return "";
  let md = html;
  // Remove wrapper tags
  md = md.replace(/<\/?(div|span)[^>]*>/g, "");
  // Headers
  md = md.replace(/<h1[^>]*>(.*?)<\/h1>/gi, "# $1\n\n");
  md = md.replace(/<h2[^>]*>(.*?)<\/h2>/gi, "## $1\n\n");
  md = md.replace(/<h3[^>]*>(.*?)<\/h3>/gi, "### $1\n\n");
  // Bold & Italic
  md = md.replace(/<strong>(.*?)<\/strong>/gi, "**$1**");
  md = md.replace(/<em>(.*?)<\/em>/gi, "*$1*");
  md = md.replace(/<u>(.*?)<\/u>/gi, "$1");
  md = md.replace(/<s>(.*?)<\/s>/gi, "~~$1~~");
  // Images
  md = md.replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gi, "![$2]($1)");
  md = md.replace(/<img[^>]*src="([^"]*)"[^>]*\/?>/gi, "![]($1)");
  // Links
  md = md.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, "[$2]($1)");
  // Lists
  md = md.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (_, items) => {
    return items.replace(/<li[^>]*>(.*?)<\/li>/gi, "- $1\n").trim() + "\n\n";
  });
  md = md.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_, items) => {
    let i = 0;
    return items.replace(/<li[^>]*>(.*?)<\/li>/gi, () => `${++i}. $1\n`).trim() + "\n\n";
  });
  // Blockquotes
  md = md.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, content) => {
    const text = content.replace(/<\/?p[^>]*>/gi, "").trim();
    return `> ${text}\n\n`;
  });
  // Code blocks
  md = md.replace(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, "```\n$1\n```\n\n");
  md = md.replace(/<code>(.*?)<\/code>/gi, "`$1`");
  // Horizontal rules
  md = md.replace(/<hr[^>]*\/?>/gi, "---\n\n");
  // Paragraphs & line breaks
  md = md.replace(/<br\s*\/?>/gi, "\n");
  md = md.replace(/<p[^>]*>(.*?)<\/p>/gi, "$1\n\n");
  // Clean up remaining tags
  md = md.replace(/<[^>]+>/g, "");
  // Clean up whitespace
  md = md.replace(/\n{3,}/g, "\n\n").trim();
  // Decode HTML entities
  md = md.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  return md;
}

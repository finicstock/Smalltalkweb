import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Paragraph } from "@tiptap/extension-paragraph";
import ImageResize from "tiptap-extension-resize-image";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Link from "@tiptap/extension-link";
import Color from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import Highlight from "@tiptap/extension-highlight";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import Youtube from "@tiptap/extension-youtube";
import {
  ArrowLeft, Save, Send, Eye, Image as ImageIcon, Video, Minus, Link as LinkIcon,
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, AlignLeft, AlignCenter,
  AlignRight, Heading1, Heading2, Heading3, List, ListOrdered, Quote, Code,
  Lock, ChevronRight, X, Upload, Undo2, Redo2, Indent, Outdent,
  Table as TableIcon, Youtube as YoutubeIcon, Paperclip, Type, Palette,
  Highlighter, ChevronDown, Plus, Trash2
} from "lucide-react";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { usePersistFn } from "@/hooks/usePersistFn";
import { useLocation, useRoute } from "wouter";
import { toast } from "sonner";

// ─── FontSize Extension (custom) ───────────────────────────
const FontSize = TextStyle.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      fontSize: {
        default: null,
        parseHTML: (element: HTMLElement) => element.style.fontSize?.replace(/['"]+/g, "") || null,
        renderHTML: (attributes: Record<string, any>) => {
          if (!attributes.fontSize && !attributes.letterSpacing) return {};
          const styles: string[] = [];
          if (attributes.fontSize) styles.push(`font-size: ${attributes.fontSize}`);
          if (attributes.letterSpacing) styles.push(`letter-spacing: ${attributes.letterSpacing}`);
          return { style: styles.join("; ") };
        },
      },
      letterSpacing: {
        default: null,
        parseHTML: (element: HTMLElement) => element.style.letterSpacing || null,
        renderHTML: (attributes: Record<string, any>) => {
          if (!attributes.letterSpacing) return {};
          return { style: `letter-spacing: ${attributes.letterSpacing}` };
        },
      },
    };
  },
});

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
    onSuccess: () => { try { localStorage.removeItem(`autosave-new-${contentType}`); } catch(e) {} utils.admin.listContents.invalidate(); toast.success("콘텐츠가 발행되었습니다."); navigate("/admin/contents"); },
    onError: (err) => toast.error(err.message || "콘텐츠 생성에 실패했습니다."),
  });
  const updateContent = trpc.admin.updateContent.useMutation({
    onSuccess: () => { try { localStorage.removeItem(`autosave-edit-${editId}`); } catch(e) {} utils.admin.listContents.invalidate(); toast.success("콘텐츠가 수정되었습니다."); navigate("/admin/contents"); },
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
  const [tags, setTags] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [paywallPosition, setPaywallPosition] = useState<number | null>(null);
  const [showPublishPanel, setShowPublishPanel] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const [showFontSize, setShowFontSize] = useState(false);
  const [showLineHeight, setShowLineHeight] = useState(false);
  const [showLetterSpacing, setShowLetterSpacing] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  // ─── Tiptap Editor ───────────────────────────
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        paragraph: false,
      }),
      Paragraph.extend({
        addAttributes() {
          return {
            ...this.parent?.(),
            style: {
              default: null,
              parseHTML: (element: HTMLElement) => element.getAttribute("style") || null,
              renderHTML: (attributes: Record<string, any>) => {
                if (!attributes.style) return {};
                return { style: attributes.style };
              },
            },
          };
        },
      }),
      ImageResize.configure({ inline: false, allowBase64: true }),
      Placeholder.configure({ placeholder: "본문을 작성하세요..." }),
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Link.configure({ openOnClick: false }),
      FontSize,
      Color,
      Highlight.configure({ multicolor: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      Youtube.configure({ inline: false, ccLanguage: "ko" }),
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
        setTags((item as any).tags ?? "");
        setThumbnailUrl(item.thumbnailUrl ?? "");
        if ((item as any).scheduledAt) {
          const d = new Date((item as any).scheduledAt);
          setScheduledAt(d.toISOString().slice(0, 16));
        }
        if (item.body && editor) {
          // If body starts with '<', it's already HTML; otherwise convert from markdown
          const html = item.body.trim().startsWith('<') ? item.body : markdownToHtml(item.body);
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

  // ─── File Attachment Upload ───────────────────────────
  const handleAttachFile = () => {
    attachInputRef.current?.click();
  };

  const handleAttachChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      toast.error("파일 크기는 50MB 이하여야 합니다.");
      return;
    }
    setIsUploading(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      const result = await utils.client.admin.uploadFile.mutate({
        filename: file.name,
        data: base64,
        contentType: file.type,
      });
      if (result?.url && editor) {
        // Insert a download link block
        editor.chain().focus().insertContent(
          `<p>📎 <a href="${result.url}" target="_blank" download="${file.name}">${file.name}</a></p>`
        ).run();
        toast.success("파일이 첨부되었습니다.");
      }
    } catch (err: any) {
      toast.error("파일 업로드에 실패했습니다.");
      console.error(err);
    } finally {
      setIsUploading(false);
    }
    e.target.value = "";
  };

  // ─── Thumbnail Upload ───────────────────────────
  const handleThumbnailSelect = () => {
    thumbnailInputRef.current?.click();
  };

  const handleThumbnailChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("이미지 파일만 업로드할 수 있습니다.");
      return;
    }
    setIsUploadingThumbnail(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      const result = await utils.client.admin.uploadImage.mutate({
        filename: file.name,
        data: base64,
        contentType: file.type,
      });
      if (result?.url) {
        setThumbnailUrl(result.url);
        toast.success("썸네일이 설정되었습니다.");
      }
    } catch (err: any) {
      toast.error("썸네일 업로드에 실패했습니다.");
      console.error(err);
    } finally {
      setIsUploadingThumbnail(false);
    }
    e.target.value = "";
  };

  // ─── Line Height ───────────────────────────
  const setLineHeight = (value: string) => {
    if (!editor) return;
    if (value === "default") {
      editor.chain().focus().updateAttributes("paragraph", { style: "" }).run();
    } else {
      const { from } = editor.state.selection;
      const node = editor.state.doc.resolve(from).parent;
      const existingStyle = node.attrs?.style || "";
      const newStyle = existingStyle.replace(/line-height:[^;]+;?/g, "") + `line-height: ${value};`;
      editor.chain().focus().updateAttributes("paragraph", { style: newStyle.trim() }).run();
    }
    setShowLineHeight(false);
  };

  // ─── Letter Spacing ───────────────────────────
  const setLetterSpacing = (value: string) => {
    if (!editor) return;
    if (value === "default") {
      editor.chain().focus().unsetMark("textStyle").run();
    } else {
      editor.chain().focus().setMark("textStyle", { letterSpacing: value }).run();
    }
    setShowLetterSpacing(false);
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

  // ─── YouTube Insert ───────────────────────────
  const insertYoutube = () => {
    if (!editor) return;
    const url = window.prompt("YouTube 영상 URL을 입력하세요:");
    if (url) {
      editor.commands.setYoutubeVideo({ src: url, width: 640, height: 360 });
    }
  };

  // ─── Table Insert ───────────────────────────
  const insertTable = () => {
    if (!editor) return;
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  // ─── Font Size ───────────────────────────
  const setFontSize = (size: string) => {
    if (!editor) return;
    if (size === "default") {
      editor.chain().focus().unsetMark("textStyle").run();
    } else {
      editor.chain().focus().setMark("textStyle", { fontSize: size }).run();
    }
    setShowFontSize(false);
  };

  // ─── Text Color ───────────────────────────
  const setTextColor = (color: string) => {
    if (!editor) return;
    if (color === "default") {
      editor.chain().focus().unsetColor().run();
    } else {
      editor.chain().focus().setColor(color).run();
    }
    setShowColorPicker(false);
  };

  // ─── Highlight Color ───────────────────────────
  const setHighlightColor = (color: string) => {
    if (!editor) return;
    if (color === "none") {
      editor.chain().focus().unsetHighlight().run();
    } else {
      editor.chain().focus().toggleHighlight({ color }).run();
    }
    setShowHighlightPicker(false);
  };

  // ─── Indent / Outdent ───────────────────────────
  const handleIndent = () => {
    if (!editor) return;
    if (editor.isActive("bulletList") || editor.isActive("orderedList")) {
      editor.chain().focus().sinkListItem("listItem").run();
    } else {
      // For paragraphs, use margin-left style
      const { from } = editor.state.selection;
      const node = editor.state.doc.resolve(from).parent;
      const currentIndent = parseInt(node.attrs?.style?.match(/margin-left:\s*(\d+)/)?.[1] || "0");
      editor.chain().focus().updateAttributes("paragraph", { style: `margin-left: ${currentIndent + 40}px` }).run();
    }
  };

  const handleOutdent = () => {
    if (!editor) return;
    if (editor.isActive("bulletList") || editor.isActive("orderedList")) {
      editor.chain().focus().liftListItem("listItem").run();
    }
  };

  // ─── Tags ───────────────────────────
  const tagList = tags ? tags.split(",").filter(Boolean) : [];
  const addTag = () => {
    const t = tagInput.trim();
    if (!t) return;
    if (tagList.includes(t)) {
      toast.error("이미 추가된 태그입니다.");
      return;
    }
    setTags(tagList.length > 0 ? `${tags},${t}` : t);
    setTagInput("");
  };
  const removeTag = (tag: string) => {
    setTags(tagList.filter((t) => t !== tag).join(","));
  };

  // ─── Auto-save (30s interval) ─────────────────────────────────────
  const [lastAutoSaved, setLastAutoSaved] = useState<Date | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);

  const autoSaveKey = useMemo(() => editId ? `autosave-edit-${editId}` : `autosave-new-${contentType}`, [editId, contentType]);

  const performAutoSave = usePersistFn(async () => {
    if (!title.trim() || !editor) return;
    const body = editor.getHTML();
    // Save to localStorage as backup
    const draft = {
      title, excerpt, slug, videoUrl, accessLevel, categoryId, tags,
      thumbnailUrl, scheduledAt, contentType, body,
      savedAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem(autoSaveKey, JSON.stringify(draft));
    } catch (e) { /* localStorage full - ignore */ }

    // Also save to server as draft (only if not already published)
    if (status === "published") return;
    setIsAutoSaving(true);
    try {
      const data: any = {
        title: title.trim(),
        slug: slug || slugify(title),
        excerpt: excerpt || undefined,
        body: body || undefined,
        thumbnailUrl: thumbnailUrl || undefined,
        contentType,
        videoUrl: videoUrl || undefined,
        accessLevel,
        status: "draft" as const,
        categoryId: categoryId && categoryId !== "none" ? parseInt(categoryId) : undefined,
        tags: tags || undefined,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      };
      if (editId) {
        await utils.client.admin.updateContent.mutate({ id: editId, ...data });
      }
      // For new content, only save to localStorage (don't create server drafts on every autosave)
      setLastAutoSaved(new Date());
    } catch (e) {
      // Silent fail for autosave
      console.warn("[AutoSave] Failed:", e);
    } finally {
      setIsAutoSaving(false);
    }
  });

  // Auto-save interval (30 seconds)
  useEffect(() => {
    if (step !== "edit") return;
    const interval = setInterval(() => {
      performAutoSave();
    }, 30000);
    return () => clearInterval(interval);
  }, [step, performAutoSave]);

  // Restore from localStorage on mount (for both new and existing content)
  useEffect(() => {
    if (!editor) return;
    // For existing content, check if there's a more recent autosave
    if (editId) {
      try {
        const saved = localStorage.getItem(`autosave-edit-${editId}`);
        if (saved) {
          const draft = JSON.parse(saved);
          const savedDate = new Date(draft.savedAt);
          const hoursSince = (Date.now() - savedDate.getTime()) / (1000 * 60 * 60);
          if (hoursSince < 24) {
            const restore = window.confirm(
              `이전에 자동 저장된 변경사항이 있습니다 (${savedDate.toLocaleString("ko-KR")}).\n불러오시겠습니까?`
            );
            if (restore) {
              setTitle(draft.title || "");
              setExcerpt(draft.excerpt || "");
              setSlug(draft.slug || "");
              setVideoUrl(draft.videoUrl || "");
              setAccessLevel(draft.accessLevel || "free");
              setCategoryId(draft.categoryId || "");
              setTags(draft.tags || "");
              setThumbnailUrl(draft.thumbnailUrl || "");
              setScheduledAt(draft.scheduledAt || "");
              if (draft.body) editor.commands.setContent(draft.body);
              toast.success("자동 저장된 변경사항을 불러왔습니다.");
            } else {
              localStorage.removeItem(`autosave-edit-${editId}`);
            }
          } else {
            localStorage.removeItem(`autosave-edit-${editId}`);
          }
        }
      } catch (e) { /* ignore */ }
      return;
    }
    // For new content
    try {
      const saved = localStorage.getItem(autoSaveKey);
      if (saved) {
        const draft = JSON.parse(saved);
        const savedDate = new Date(draft.savedAt);
        const hoursSince = (Date.now() - savedDate.getTime()) / (1000 * 60 * 60);
        if (hoursSince < 24) {
          // Ask user if they want to restore
          const restore = window.confirm(
            `이전에 작성 중이던 글이 있습니다 (${savedDate.toLocaleString("ko-KR")}).\n불러오시겠습니까?`
          );
          if (restore) {
            setTitle(draft.title || "");
            setExcerpt(draft.excerpt || "");
            setSlug(draft.slug || "");
            setVideoUrl(draft.videoUrl || "");
            setAccessLevel(draft.accessLevel || "free");
            setCategoryId(draft.categoryId || "");
            setTags(draft.tags || "");
            setThumbnailUrl(draft.thumbnailUrl || "");
            setScheduledAt(draft.scheduledAt || "");
            if (draft.body) editor.commands.setContent(draft.body);
            toast.success("임시저장된 글을 불러왔습니다.");
          } else {
            localStorage.removeItem(autoSaveKey);
          }
        } else {
          // Too old, remove
          localStorage.removeItem(autoSaveKey);
        }
      }
    } catch (e) { /* ignore */ }
  }, [editor, autoSaveKey, editId]);

  // Clear autosave on successful publish
  const clearAutoSave = useCallback(() => {
    try { localStorage.removeItem(autoSaveKey); } catch (e) { /* ignore */ }
  }, [autoSaveKey]);

  // ─── Submit ─────────────────────────────────────
  const handleSave = (publishStatus: "draft" | "published") => { if (!title.trim()) {
      toast.error("제목을 입력해주세요.");
      return;
    }

    const body = editor ? editor.getHTML() : "";
    const data: any = {
      title: title.trim(),
      slug: slug || slugify(title),
      excerpt: excerpt || undefined,
      body: body || undefined,
      thumbnailUrl: thumbnailUrl || undefined,
      contentType,
      videoUrl: videoUrl || undefined,
      accessLevel,
      status: publishStatus,
      categoryId: categoryId && categoryId !== "none" ? parseInt(categoryId) : undefined,
      tags: tags || undefined,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
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
            {/* Auto-save indicator */}
            {isAutoSaving && (
              <span className="text-xs text-muted-foreground animate-pulse">자동 저장 중...</span>
            )}
            {!isAutoSaving && lastAutoSaved && (
              <span className="text-xs text-muted-foreground">
                자동 저장 {lastAutoSaved.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="text-[13px] gap-1.5"
              onClick={() => setShowShortcuts(true)}
              title="단축키 안내"
            >
              <Code className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-[13px] gap-1.5"
              onClick={() => setShowPreview(true)}
            >
              <Eye className="h-3.5 w-3.5" /> 미리보기
            </Button>
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
            <div className="sticky top-14 z-10 bg-white border-b border-gray-200 -mx-6 px-4 py-1.5 mb-4">
              {/* Row 1: Text formatting */}
              <div className="flex items-center gap-0.5 flex-wrap">
                {/* Undo / Redo */}
                <ToolbarButton icon={Undo2} label="실행취소" onClick={() => editor?.chain().focus().undo().run()} />
                <ToolbarButton icon={Redo2} label="다시실행" onClick={() => editor?.chain().focus().redo().run()} />
                <ToolbarSeparator />

                {/* Headings */}
                <ToolbarButton icon={Heading1} label="제목1" onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} active={editor?.isActive("heading", { level: 1 })} />
                <ToolbarButton icon={Heading2} label="제목2" onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} active={editor?.isActive("heading", { level: 2 })} />
                <ToolbarButton icon={Heading3} label="제목3" onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()} active={editor?.isActive("heading", { level: 3 })} />
                <ToolbarSeparator />

                {/* Font Size Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => { setShowFontSize(!showFontSize); setShowColorPicker(false); setShowHighlightPicker(false); }}
                    title="글자 크기"
                    className="flex items-center gap-0.5 px-1.5 py-1.5 rounded text-gray-500 hover:bg-gray-100 hover:text-gray-700 text-[12px]"
                  >
                    <Type className="h-3.5 w-3.5" />
                    <ChevronDown className="h-3 w-3" />
                  </button>
                  {showFontSize && (
                    <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 w-32">
                      {[
                        { label: "기본", value: "default" },
                        { label: "12px", value: "12px" },
                        { label: "14px", value: "14px" },
                        { label: "16px", value: "16px" },
                        { label: "18px", value: "18px" },
                        { label: "20px", value: "20px" },
                        { label: "24px", value: "24px" },
                        { label: "28px", value: "28px" },
                        { label: "32px", value: "32px" },
                        { label: "36px", value: "36px" },
                      ].map((s) => (
                        <button
                          key={s.value}
                          onClick={() => setFontSize(s.value)}
                          className="w-full text-left px-3 py-1.5 text-[12px] hover:bg-gray-100"
                          style={{ fontSize: s.value === "default" ? undefined : s.value }}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <ToolbarSeparator />

                {/* Bold, Italic, Underline, Strike */}
                <ToolbarButton icon={Bold} label="굵게" onClick={() => editor?.chain().focus().toggleBold().run()} active={editor?.isActive("bold")} />
                <ToolbarButton icon={Italic} label="기울임" onClick={() => editor?.chain().focus().toggleItalic().run()} active={editor?.isActive("italic")} />
                <ToolbarButton icon={UnderlineIcon} label="밑줄" onClick={() => editor?.chain().focus().toggleUnderline().run()} active={editor?.isActive("underline")} />
                <ToolbarButton icon={Strikethrough} label="취소선" onClick={() => editor?.chain().focus().toggleStrike().run()} active={editor?.isActive("strike")} />
                <ToolbarSeparator />

                {/* Text Color */}
                <div className="relative">
                  <button
                    onClick={() => { setShowColorPicker(!showColorPicker); setShowHighlightPicker(false); setShowFontSize(false); }}
                    title="글자색"
                    className="flex items-center gap-0.5 px-1.5 py-1.5 rounded text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                  >
                    <Palette className="h-4 w-4" />
                    <ChevronDown className="h-3 w-3" />
                  </button>
                  {showColorPicker && (
                    <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg p-3 z-50 min-w-[200px]">
                      <p className="text-[11px] text-gray-500 mb-2 px-1 font-medium">자주 사용하는 색</p>
                      <div className="flex gap-2 mb-3 pb-3 border-b border-gray-100">
                        <button
                          onClick={() => setTextColor("#e74c3c")}
                          title="빨간색"
                          className="w-10 h-10 rounded-lg border-2 border-red-200 hover:scale-110 transition-transform shadow-sm"
                          style={{ backgroundColor: "#e74c3c" }}
                        />
                        <button
                          onClick={() => setTextColor("#2c3e50")}
                          title="남색"
                          className="w-10 h-10 rounded-lg border-2 border-slate-200 hover:scale-110 transition-transform shadow-sm"
                          style={{ backgroundColor: "#2c3e50" }}
                        />
                      </div>
                      <p className="text-[11px] text-gray-500 mb-2 px-1 font-medium">전체 색상</p>
                      <div className="grid grid-cols-6 gap-2">
                        {TEXT_COLORS.map((c) => (
                          <button
                            key={c.value}
                            onClick={() => setTextColor(c.value)}
                            title={c.label}
                            className="w-7 h-7 rounded-md border border-gray-200 hover:scale-110 transition-transform"
                            style={{ backgroundColor: c.value === "default" ? "#1a1a1a" : c.value }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Highlight Color */}
                <div className="relative">
                  <button
                    onClick={() => { setShowHighlightPicker(!showHighlightPicker); setShowColorPicker(false); setShowFontSize(false); }}
                    title="형광펜"
                    className="flex items-center gap-0.5 px-1.5 py-1.5 rounded text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                  >
                    <Highlighter className="h-4 w-4" />
                    <ChevronDown className="h-3 w-3" />
                  </button>
                  {showHighlightPicker && (
                    <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg p-3 z-50 min-w-[200px]">
                      <p className="text-[11px] text-gray-500 mb-2 px-1 font-medium">자주 사용하는 색</p>
                      <div className="flex gap-2 mb-3 pb-3 border-b border-gray-100">
                        <button
                          onClick={() => setHighlightColor("#fef08a")}
                          title="노란색"
                          className="w-10 h-10 rounded-lg border-2 border-yellow-300 hover:scale-110 transition-transform shadow-sm"
                          style={{ backgroundColor: "#fef08a" }}
                        />
                        <button
                          onClick={() => setHighlightColor("none")}
                          title="없음"
                          className="w-10 h-10 rounded-lg border-2 border-gray-200 hover:scale-110 transition-transform shadow-sm bg-white flex items-center justify-center"
                        >
                          <X className="h-4 w-4 text-gray-400" />
                        </button>
                      </div>
                      <p className="text-[11px] text-gray-500 mb-2 px-1 font-medium">전체 색상</p>
                      <div className="grid grid-cols-6 gap-2">
                        {HIGHLIGHT_COLORS.map((c) => (
                          <button
                            key={c.value}
                            onClick={() => setHighlightColor(c.value)}
                            title={c.label}
                            className="w-7 h-7 rounded-md border border-gray-200 hover:scale-110 transition-transform"
                            style={{ backgroundColor: c.value === "none" ? "#ffffff" : c.value }}
                          >
                            {c.value === "none" && <X className="h-3 w-3 mx-auto text-gray-400" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <ToolbarSeparator />

                {/* Alignment */}
                <ToolbarButton icon={AlignLeft} label="왼쪽" onClick={() => editor?.chain().focus().setTextAlign("left").run()} active={editor?.isActive({ textAlign: "left" })} />
                <ToolbarButton icon={AlignCenter} label="가운데" onClick={() => editor?.chain().focus().setTextAlign("center").run()} active={editor?.isActive({ textAlign: "center" })} />
                <ToolbarButton icon={AlignRight} label="오른쪽" onClick={() => editor?.chain().focus().setTextAlign("right").run()} active={editor?.isActive({ textAlign: "right" })} />
                <ToolbarSeparator />

                {/* Line Height */}
                <div className="relative">
                  <button
                    onClick={() => { setShowLineHeight(!showLineHeight); setShowLetterSpacing(false); setShowColorPicker(false); setShowHighlightPicker(false); setShowFontSize(false); }}
                    title="줄 간격"
                    className="flex items-center gap-0.5 px-1.5 py-1.5 rounded text-gray-500 hover:bg-gray-100 hover:text-gray-700 text-[11px]"
                  >
                    <span className="text-[11px] font-medium">줄</span>
                    <ChevronDown className="h-3 w-3" />
                  </button>
                  {showLineHeight && (
                    <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 w-28">
                      {[
                        { label: "기본", value: "default" },
                        { label: "1.0 (좁게)", value: "1.0" },
                        { label: "1.2", value: "1.2" },
                        { label: "1.4", value: "1.4" },
                        { label: "1.6 (보통)", value: "1.6" },
                        { label: "1.8", value: "1.8" },
                        { label: "2.0 (넓게)", value: "2.0" },
                        { label: "2.4", value: "2.4" },
                        { label: "2.8", value: "2.8" },
                      ].map((s) => (
                        <button
                          key={s.value}
                          onClick={() => setLineHeight(s.value)}
                          className="w-full text-left px-3 py-1.5 text-[12px] hover:bg-gray-100"
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Letter Spacing */}
                <div className="relative">
                  <button
                    onClick={() => { setShowLetterSpacing(!showLetterSpacing); setShowLineHeight(false); setShowColorPicker(false); setShowHighlightPicker(false); setShowFontSize(false); }}
                    title="자간"
                    className="flex items-center gap-0.5 px-1.5 py-1.5 rounded text-gray-500 hover:bg-gray-100 hover:text-gray-700 text-[11px]"
                  >
                    <span className="text-[11px] font-medium">자</span>
                    <ChevronDown className="h-3 w-3" />
                  </button>
                  {showLetterSpacing && (
                    <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 w-28">
                      {[
                        { label: "기본", value: "default" },
                        { label: "-2px (좁게)", value: "-2px" },
                        { label: "-1px", value: "-1px" },
                        { label: "-0.5px", value: "-0.5px" },
                        { label: "0px", value: "0px" },
                        { label: "0.5px", value: "0.5px" },
                        { label: "1px", value: "1px" },
                        { label: "2px (넓게)", value: "2px" },
                        { label: "3px", value: "3px" },
                      ].map((s) => (
                        <button
                          key={s.value}
                          onClick={() => setLetterSpacing(s.value)}
                          className="w-full text-left px-3 py-1.5 text-[12px] hover:bg-gray-100"
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <ToolbarSeparator />

                {/* Lists & Indent */}
                <ToolbarButton icon={List} label="목록" onClick={() => editor?.chain().focus().toggleBulletList().run()} active={editor?.isActive("bulletList")} />
                <ToolbarButton icon={ListOrdered} label="번호목록" onClick={() => editor?.chain().focus().toggleOrderedList().run()} active={editor?.isActive("orderedList")} />
                <ToolbarButton icon={Indent} label="들여쓰기" onClick={handleIndent} />
                <ToolbarButton icon={Outdent} label="내어쓰기" onClick={handleOutdent} />
                <ToolbarSeparator />

                {/* Block elements */}
                <ToolbarButton icon={Quote} label="인용" onClick={() => editor?.chain().focus().toggleBlockquote().run()} active={editor?.isActive("blockquote")} />
                <ToolbarButton icon={Code} label="코드" onClick={() => editor?.chain().focus().toggleCodeBlock().run()} active={editor?.isActive("codeBlock")} />
                <ToolbarButton icon={Minus} label="구분선" onClick={() => editor?.chain().focus().setHorizontalRule().run()} />
                <ToolbarSeparator />

                {/* Media & Insert */}
                <ToolbarButton icon={ImageIcon} label="이미지" onClick={handleImageSelect} />
                <ToolbarButton icon={YoutubeIcon} label="YouTube" onClick={insertYoutube} />
                <ToolbarButton icon={TableIcon} label="표 삽입" onClick={insertTable} />
                <ToolbarButton icon={LinkIcon} label="링크" onClick={insertLink} active={editor?.isActive("link")} />
                <ToolbarButton icon={Paperclip} label="파일 첨부" onClick={handleAttachFile} />
                <ToolbarSeparator />

                {/* Paywall */}
                <button
                  onClick={insertPaywall}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-[12px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-md hover:bg-amber-100 transition-colors"
                >
                  <Lock className="h-3 w-3" /> 페이월
                </button>
              </div>

              {/* Table controls (shown when cursor is in table) */}
              {editor?.isActive("table") && (
                <div className="flex items-center gap-1 mt-1.5 pt-1.5 border-t border-gray-100">
                  <span className="text-[11px] text-gray-400 mr-1">표:</span>
                  <button onClick={() => editor.chain().focus().addColumnAfter().run()} className="px-2 py-1 text-[11px] text-gray-600 bg-gray-100 rounded hover:bg-gray-200">열 추가</button>
                  <button onClick={() => editor.chain().focus().addRowAfter().run()} className="px-2 py-1 text-[11px] text-gray-600 bg-gray-100 rounded hover:bg-gray-200">행 추가</button>
                  <button onClick={() => editor.chain().focus().deleteColumn().run()} className="px-2 py-1 text-[11px] text-red-600 bg-red-50 rounded hover:bg-red-100">열 삭제</button>
                  <button onClick={() => editor.chain().focus().deleteRow().run()} className="px-2 py-1 text-[11px] text-red-600 bg-red-50 rounded hover:bg-red-100">행 삭제</button>
                  <button onClick={() => editor.chain().focus().deleteTable().run()} className="px-2 py-1 text-[11px] text-red-600 bg-red-50 rounded hover:bg-red-100">표 삭제</button>
                  <button onClick={() => editor.chain().focus().mergeCells().run()} className="px-2 py-1 text-[11px] text-gray-600 bg-gray-100 rounded hover:bg-gray-200">셀 병합</button>
                  <button onClick={() => editor.chain().focus().splitCell().run()} className="px-2 py-1 text-[11px] text-gray-600 bg-gray-100 rounded hover:bg-gray-200">셀 분할</button>
                </div>
              )}
            </div>

            {/* Editor Content */}
            {isUploading && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-[13px] text-blue-700 flex items-center gap-2">
                <Upload className="h-4 w-4 animate-pulse" /> 업로드 중...
              </div>
            )}
            <EditorContent editor={editor} className="editor-content" />

            {/* Hidden file inputs */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <input
              ref={attachInputRef}
              type="file"
              accept="*/*"
              onChange={handleAttachChange}
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
                {/* Thumbnail */}
                <div className="space-y-1.5">
                  <Label className="text-[13px] text-gray-700">썸네일 이미지</Label>
                  {thumbnailUrl ? (
                    <div className="relative group">
                      <img src={thumbnailUrl} alt="썸네일" className="w-full h-40 object-cover rounded-lg border border-gray-200" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                        <button onClick={handleThumbnailSelect} className="px-3 py-1.5 bg-white text-gray-800 rounded text-[12px] font-medium hover:bg-gray-100">
                          변경
                        </button>
                        <button onClick={() => setThumbnailUrl("")} className="px-3 py-1.5 bg-red-500 text-white rounded text-[12px] font-medium hover:bg-red-600">
                          삭제
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={handleThumbnailSelect}
                      disabled={isUploadingThumbnail}
                      className="w-full h-32 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center gap-2 hover:border-gray-400 hover:bg-gray-50 transition-colors"
                    >
                      {isUploadingThumbnail ? (
                        <span className="text-[12px] text-gray-500 animate-pulse">업로드 중...</span>
                      ) : (
                        <>
                          <ImageIcon className="h-6 w-6 text-gray-400" />
                          <span className="text-[12px] text-gray-500">클릭하여 썸네일 업로드</span>
                        </>
                      )}
                    </button>
                  )}
                  <p className="text-[11px] text-gray-400">콘텐츠 목록 카드에 표시됩니다.</p>
                  <input
                    ref={thumbnailInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleThumbnailChange}
                    className="hidden"
                  />
                </div>

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

                {/* Tags */}
                <div className="space-y-1.5">
                  <Label className="text-[13px] text-gray-700">태그</Label>
                  <div className="flex gap-1.5">
                    <Input
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                      placeholder="태그 입력 후 Enter"
                      className="text-[13px] bg-white flex-1"
                    />
                    <Button variant="outline" size="sm" onClick={addTag} className="text-[12px] px-2">
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  {tagList.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {tagList.map((tag) => (
                        <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-200 text-gray-700 rounded text-[12px]">
                          #{tag}
                          <button onClick={() => removeTag(tag)} className="hover:text-red-500">
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
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

                {/* Scheduled Publish */}
                <div className="space-y-1.5">
                  <Label className="text-[13px] text-gray-700">예약 발행</Label>
                  <Input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="text-[13px] bg-white"
                    min={new Date().toISOString().slice(0, 16)}
                  />
                  {scheduledAt && (
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] text-blue-600">
                        {new Date(scheduledAt).toLocaleString("ko-KR")} 에 자동 발행됩니다.
                      </p>
                      <button onClick={() => setScheduledAt("")} className="text-[11px] text-gray-400 hover:text-red-500">
                        취소
                      </button>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Action Buttons */}
                <div className="space-y-2">
                  {scheduledAt ? (
                    <Button
                      className="w-full text-[13px] bg-blue-600 hover:bg-blue-700"
                      onClick={() => handleSave("published")}
                      disabled={createContent.isPending || updateContent.isPending}
                    >
                      <Send className="h-3.5 w-3.5 mr-1.5" />
                      예약 발행 설정
                    </Button>
                  ) : (
                    <Button
                      className="w-full text-[13px] bg-[#2B3A4E] hover:bg-[#1e2b3a]"
                      onClick={() => handleSave("published")}
                      disabled={createContent.isPending || updateContent.isPending}
                    >
                      <Send className="h-3.5 w-3.5 mr-1.5" />
                      {editId ? "수정 발행" : "발행하기"}
                    </Button>
                  )}
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

      {/* Close dropdowns on click outside */}
      {(showColorPicker || showHighlightPicker || showFontSize || showLineHeight || showLetterSpacing) && (
        <div
          className="fixed inset-0 z-[5]"
          onClick={() => { setShowColorPicker(false); setShowHighlightPicker(false); setShowFontSize(false); setShowLineHeight(false); setShowLetterSpacing(false); }}
        />
      )}

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center overflow-y-auto py-8">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl mx-4 my-4">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-xl">
              <div className="flex items-center gap-3">
                <Eye className="h-5 w-5 text-gray-600" />
                <h2 className="text-lg font-semibold text-gray-900">미리보기</h2>
                {accessLevel === "paid" && (
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">유료</span>
                )}
              </div>
              <button onClick={() => setShowPreview(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="px-6 py-8">
              {thumbnailUrl && (
                <div className="mb-6 rounded-lg overflow-hidden">
                  <img src={thumbnailUrl} alt="썸네일" className="w-full h-48 object-cover" />
                </div>
              )}
              <h1 className="text-3xl font-bold text-gray-900 mb-3">{title || "제목 없음"}</h1>
              {excerpt && <p className="text-gray-500 text-base mb-6">{excerpt}</p>}
              <div className="flex items-center gap-3 text-sm text-gray-400 mb-8 pb-6 border-b border-gray-100">
                <span>닉스의 스몰톡</span>
                <span>·</span>
                <span>{new Date().toLocaleDateString("ko-KR")}</span>
                {tags && (
                  <>
                    <span>·</span>
                    <span>{tags.split(",").map(t => `#${t.trim()}`).join(" ")}</span>
                  </>
                )}
              </div>
              <div
                className="content-body prose prose-lg max-w-none"
                dangerouslySetInnerHTML={{ __html: editor?.getHTML() || "" }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Shortcuts Modal */}
      {showShortcuts && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
            <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">⌨️ 단축키 안내</h2>
              <button onClick={() => setShowShortcuts(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
              <div className="space-y-1">
                {SHORTCUTS.map((s, i) => (
                  <div key={i} className="flex items-center justify-between py-2 px-2 rounded hover:bg-gray-50">
                    <span className="text-sm text-gray-700">{s.label}</span>
                    <kbd className="text-xs bg-gray-100 border border-gray-200 rounded px-2 py-1 font-mono text-gray-600">{s.keys}</kbd>
                  </div>
                ))}
              </div>
            </div>
            <div className="border-t border-gray-100 px-6 py-3">
              <p className="text-xs text-gray-400 text-center">Mac에서는 Ctrl 대신 ⌘(Cmd)를 사용하세요</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Color Constants ───────────────────────────
const TEXT_COLORS = [
  { label: "기본", value: "default" },
  { label: "검정", value: "#000000" },
  { label: "진회색", value: "#4a4a4a" },
  { label: "회색", value: "#9b9b9b" },
  { label: "빨강", value: "#e74c3c" },
  { label: "주황", value: "#e67e22" },
  { label: "노랑", value: "#f1c40f" },
  { label: "초록", value: "#27ae60" },
  { label: "파랑", value: "#2980b9" },
  { label: "남색", value: "#2c3e50" },
  { label: "보라", value: "#8e44ad" },
  { label: "분홍", value: "#e91e63" },
];

const HIGHLIGHT_COLORS = [
  { label: "없음", value: "none" },
  { label: "노랑", value: "#fef08a" },
  { label: "초록", value: "#bbf7d0" },
  { label: "파랑", value: "#bfdbfe" },
  { label: "분홍", value: "#fecdd3" },
  { label: "보라", value: "#e9d5ff" },
  { label: "주황", value: "#fed7aa" },
  { label: "회색", value: "#e5e7eb" },
  { label: "연노랑", value: "#fef9c3" },
  { label: "연초록", value: "#dcfce7" },
  { label: "연파랑", value: "#dbeafe" },
  { label: "연분홍", value: "#ffe4e6" },
];
const SHORTCUTS = [
  { label: "굵게", keys: "Ctrl + B" },
  { label: "기울임", keys: "Ctrl + I" },
  { label: "밑줄", keys: "Ctrl + U" },
  { label: "취소선", keys: "Ctrl + Shift + S" },
  { label: "제목 1", keys: "Ctrl + Alt + 1" },
  { label: "제목 2", keys: "Ctrl + Alt + 2" },
  { label: "제목 3", keys: "Ctrl + Alt + 3" },
  { label: "단락", keys: "Ctrl + Alt + 0" },
  { label: "불릿 목록", keys: "Ctrl + Shift + 8" },
  { label: "번호 목록", keys: "Ctrl + Shift + 7" },
  { label: "인용문", keys: "Ctrl + Shift + B" },
  { label: "코드 블록", keys: "Ctrl + Alt + C" },
  { label: "구분선", keys: "Ctrl + Shift + -" },
  { label: "링크 삽입", keys: "Ctrl + K" },
  { label: "실행 취소", keys: "Ctrl + Z" },
  { label: "다시 실행", keys: "Ctrl + Shift + Z" },
  { label: "왼쪽 정렬", keys: "Ctrl + Shift + L" },
  { label: "가운데 정렬", keys: "Ctrl + Shift + E" },
  { label: "오른쪽 정렬", keys: "Ctrl + Shift + R" },
  { label: "들여쓰기", keys: "Tab" },
  { label: "내어쓰기", keys: "Shift + Tab" },
];

// ─── Toolbar Components ─────────────────────────────────────
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
  // YouTube embeds
  md = md.replace(/<div[^>]*data-youtube-video[^>]*>[\s\S]*?<iframe[^>]*src="([^"]*)"[^>]*>[\s\S]*?<\/div>/gi, "\n[YouTube]($1)\n\n");
  // Tables
  md = md.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (_, tableContent) => {
    const rows: string[][] = [];
    const rowMatches = tableContent.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];
    rowMatches.forEach((row: string) => {
      const cells: string[] = [];
      const cellMatches = row.match(/<(?:td|th)[^>]*>([\s\S]*?)<\/(?:td|th)>/gi) || [];
      cellMatches.forEach((cell: string) => {
        cells.push(cell.replace(/<[^>]+>/g, "").trim());
      });
      rows.push(cells);
    });
    if (rows.length === 0) return "";
    const colCount = Math.max(...rows.map(r => r.length));
    let table = "";
    rows.forEach((row, idx) => {
      table += "| " + row.map(c => c || " ").join(" | ") + " |\n";
      if (idx === 0) {
        table += "| " + Array(colCount).fill("---").join(" | ") + " |\n";
      }
    });
    return table + "\n";
  });
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

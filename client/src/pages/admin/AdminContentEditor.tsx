import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useEditor, EditorContent, Node, NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer, mergeAttributes } from "@tiptap/react";
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
  Highlighter, ChevronDown, Plus, Trash2, Maximize2, Minimize2, FileText,
  Clock, History, Share2, BookTemplate, CircleDot, Square, Triangle, Hash
} from "lucide-react";
import { useState, useEffect, useCallback, useRef, useMemo, type CSSProperties, type MouseEvent as ReactMouseEvent } from "react";
import { usePersistFn } from "@/hooks/usePersistFn";
import { useLocation, useRoute } from "wouter";
import { toast } from "sonner";
import { sanitizeHtml } from "@/lib/sanitizeHtml";

// ─── Rich Text Style Extension (custom) ───────────────────────────
function renderRichTextStyle(attributes: Record<string, any>) {
  const styles: string[] = [];
  if (attributes.fontSize) styles.push(`font-size: ${attributes.fontSize}`);
  if (attributes.fontFamily) styles.push(`font-family: ${attributes.fontFamily}`);
  if (attributes.letterSpacing) styles.push(`letter-spacing: ${attributes.letterSpacing}`);
  return styles.length ? { style: styles.join("; ") } : {};
}

const RichTextStyle = TextStyle.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      fontSize: {
        default: null,
        parseHTML: (element: HTMLElement) => element.style.fontSize?.replace(/['"]+/g, "") || null,
        renderHTML: renderRichTextStyle,
      },
      fontFamily: {
        default: null,
        parseHTML: (element: HTMLElement) => element.style.fontFamily?.replace(/['"]+/g, "") || null,
        renderHTML: renderRichTextStyle,
      },
      letterSpacing: {
        default: null,
        parseHTML: (element: HTMLElement) => element.style.letterSpacing || null,
        renderHTML: renderRichTextStyle,
      },
    };
  },
});

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function QuoteBlockView(props: any) {
  const styleName = props.node.attrs.styleName || "basic";
  const setNodeSelection = () => {
    if (typeof props.getPos === "function") {
      props.editor.commands.setNodeSelection(props.getPos());
    }
  };

  const copyQuote = async () => {
    try {
      await navigator.clipboard.writeText(props.node.textContent || "");
      setNodeSelection();
      toast.success("인용구를 복사했습니다.");
    } catch {
      toast.error("인용구 복사에 실패했습니다.");
    }
  };

  const pasteQuote = async () => {
    try {
      const text = (await navigator.clipboard.readText()).trim();
      if (!text || typeof props.getPos !== "function") {
        toast.info("붙여넣을 텍스트가 없습니다.");
        return;
      }
      props.editor
        .chain()
        .focus()
        .insertContentAt(props.getPos() + props.node.nodeSize, {
          type: "quoteBlock",
          attrs: { styleName },
          content: text.split(/\n+/).map((line: string) => ({
            type: "paragraph",
            content: [{ type: "text", text: line }],
          })),
        })
        .run();
      toast.success("클립보드 텍스트를 인용구로 붙여넣었습니다.");
    } catch {
      toast.error("클립보드 접근에 실패했습니다.");
    }
  };

  return (
    <NodeViewWrapper
      as="div"
      data-quote-block
      data-quote-style={styleName}
      className={`quote-node quote-node-${styleName} ${props.selected ? "is-selected" : ""}`}
      onClick={(event: ReactMouseEvent) => {
        const target = event.target as HTMLElement;
        if (target.closest("[data-quote-toolbar]") || target.closest(".quote-node-content")) return;
        setNodeSelection();
      }}
    >
      <div className="quote-node-shell">
        <button
          type="button"
          className="quote-node-drag"
          data-drag-handle
          title="인용구 선택 및 이동"
          onMouseDown={setNodeSelection}
        >
          <span />
          <span />
          <span />
        </button>
        <NodeViewContent className="quote-node-content" />
        <div className="quote-node-tools" data-quote-toolbar contentEditable={false}>
          <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={copyQuote}>
            복사
          </button>
          <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={pasteQuote}>
            붙여넣기
          </button>
          <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={props.deleteNode}>
            삭제
          </button>
        </div>
      </div>
    </NodeViewWrapper>
  );
}

const QuoteBlock = Node.create({
  name: "quoteBlock",
  group: "block",
  content: "block+",
  defining: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      styleName: {
        default: "basic",
        parseHTML: (element: HTMLElement) => element.getAttribute("data-quote-style") || "basic",
        renderHTML: (attributes: Record<string, any>) => ({ "data-quote-style": attributes.styleName || "basic" }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-quote-block]" }];
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, any> }) {
    const styleName = HTMLAttributes["data-quote-style"] || "basic";
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-quote-block": "",
        class: `quote-block quote-block-${styleName}`,
      }),
      0,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(QuoteBlockView);
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
type TextPromptKind = "link" | "youtube" | "caption";
type TextPromptConfig = {
  kind: TextPromptKind;
  title: string;
  description: string;
  label: string;
  placeholder: string;
  confirmLabel: string;
};

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
  const generatePreviewToken = trpc.admin.generatePreviewToken.useMutation({
    onSuccess: (data) => { setPreviewToken(data.token); toast.success("미리보기 링크가 생성되었습니다."); },
    onError: () => toast.error("미리보기 링크 생성 실패"),
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
  const [showFontFamily, setShowFontFamily] = useState(false);
  const [showFontSize, setShowFontSize] = useState(false);
  const [showLineHeight, setShowLineHeight] = useState(false);
  const [showLetterSpacing, setShowLetterSpacing] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSeoPanel, setShowSeoPanel] = useState(false);
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [ogImageUrl, setOgImageUrl] = useState("");
  const [showTemplates, setShowTemplates] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showBulletStyle, setShowBulletStyle] = useState(false);
  const [showQuoteStyles, setShowQuoteStyles] = useState(false);
  const [previewToken, setPreviewToken] = useState<string | null>(null);
  const [textPrompt, setTextPrompt] = useState<TextPromptConfig | null>(null);
  const [textPromptValue, setTextPromptValue] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  const closeToolbarMenus = () => {
    setShowColorPicker(false);
    setShowHighlightPicker(false);
    setShowFontFamily(false);
    setShowFontSize(false);
    setShowLineHeight(false);
    setShowLetterSpacing(false);
    setShowBulletStyle(false);
    setShowQuoteStyles(false);
  };

  const openTextPrompt = (config: TextPromptConfig) => {
    setTextPrompt(config);
    setTextPromptValue("");
  };

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
      QuoteBlock,
      ImageResize.configure({ inline: false, allowBase64: true }),
      Placeholder.configure({ placeholder: "본문을 작성하세요..." }),
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Link.configure({ openOnClick: false }),
      RichTextStyle,
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
      handleDrop: (view, event, _slice, moved) => {
        if (!moved && event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0]) {
          const file = event.dataTransfer.files[0];
          if (file.type.startsWith("image/")) {
            event.preventDefault();
            uploadImage(file);
            return true;
          }
        }
        return false;
      },
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items;
        if (items) {
          for (let i = 0; i < items.length; i++) {
            if (items[i].type.startsWith("image/")) {
              const file = items[i].getAsFile();
              if (file) {
                event.preventDefault();
                uploadImage(file);
                return true;
              }
            }
          }
        }
        return false;
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
      editor.chain().focus().setMark("textStyle", { letterSpacing: null }).run();
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
    openTextPrompt({
      kind: "link",
      title: "링크 삽입",
      description: "선택한 텍스트에 연결할 URL을 입력하세요.",
      label: "URL",
      placeholder: "https://example.com",
      confirmLabel: "링크 적용",
    });
  };

  // ─── YouTube Insert ───────────────────────────
  const insertYoutube = () => {
    openTextPrompt({
      kind: "youtube",
      title: "YouTube 영상 삽입",
      description: "본문에 삽입할 YouTube 영상 URL을 입력하세요.",
      label: "YouTube URL",
      placeholder: "https://www.youtube.com/watch?v=...",
      confirmLabel: "영상 삽입",
    });
  };

  const insertCaption = () => {
    openTextPrompt({
      kind: "caption",
      title: "이미지 캡션",
      description: "이미지 아래에 표시할 짧은 설명을 입력하세요.",
      label: "캡션",
      placeholder: "이미지 설명",
      confirmLabel: "캡션 삽입",
    });
  };

  const handleTextPromptSubmit = () => {
    if (!editor || !textPrompt) return;
    const value = textPromptValue.trim();
    if (!value) {
      setTextPrompt(null);
      return;
    }

    if (textPrompt.kind === "link") {
      editor.chain().focus().setLink({ href: value }).run();
    }

    if (textPrompt.kind === "youtube") {
      editor.commands.setYoutubeVideo({ src: value, width: 640, height: 360 });
    }

    if (textPrompt.kind === "caption") {
      editor
        .chain()
        .focus()
        .insertContent(`<figure class="image-caption"><figcaption>${escapeHtml(value)}</figcaption></figure>`)
        .run();
    }

    setTextPrompt(null);
    setTextPromptValue("");
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
      editor.chain().focus().setMark("textStyle", { fontSize: null }).run();
    } else {
      editor.chain().focus().setMark("textStyle", { fontSize: size }).run();
    }
    setShowFontSize(false);
  };

  // ─── Font Family ───────────────────────────
  const setFontFamily = (fontFamily: string) => {
    if (!editor) return;
    if (fontFamily === "default") {
      editor.chain().focus().setMark("textStyle", { fontFamily: null }).run();
    } else {
      editor.chain().focus().setMark("textStyle", { fontFamily }).run();
    }
    setShowFontFamily(false);
  };

  // ─── Quote Styles ───────────────────────────
  const insertQuoteStyle = (style: QuoteStyle) => {
    if (!editor) return;
    setShowQuoteStyles(false);

    const { from, to, empty } = editor.state.selection;
    const selectedText = empty
      ? "인용문을 입력하세요"
      : editor.state.doc.textBetween(from, to, "\n").trim() || "인용문을 입력하세요";

    const chain = editor.chain().focus();
    if (!empty) chain.deleteSelection();
    chain
      .insertContent({
        type: "quoteBlock",
        attrs: { styleName: style.value },
        content: selectedText.split(/\n+/).map((line) => ({
          type: "paragraph",
          content: [{ type: "text", text: line }],
        })),
      })
      .run();
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
      seoTitle: seoTitle || undefined,
      seoDescription: seoDescription || undefined,
      ogImageUrl: ogImageUrl || undefined,
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

   // ─── STEP 2 & 3: Editor + Publish Panel ───────────────────────
  return (
    <div className={`min-h-screen bg-white flex flex-col ${isFullscreen ? 'fixed inset-0 z-[100]' : ''}`}>
      {/* Top Bar */}
      <div className="border-b border-gray-200 bg-white sticky top-0 z-20">
        <div className="max-w-[1200px] mx-auto px-6 h-14 flex items-center justify-between">
          <button onClick={() => navigate("/admin/contents")} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
            <ArrowLeft className="h-4 w-4" /> 콘텐츠 관리
          </button>

          <div className="flex items-center gap-2">
            {/* Word count & reading time */}
            {editor && (
              <span className="text-[11px] text-gray-400 hidden sm:inline">
                {editor.storage.characterCount?.characters?.() ?? editor.state.doc.textContent.length}자
                · 약 {Math.max(1, Math.ceil((editor.state.doc.textContent.length) / 500))}분
              </span>
            )}
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
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? "전체화면 해제" : "전체화면"}
            >
              {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-[13px] gap-1.5"
              onClick={() => setShowShortcuts(true)}
              title="단축키 안내"
            >
              <Code className="h-3.5 w-3.5" />
            </Button>
            {editId && (
              <Button
                variant="ghost"
                size="sm"
                className="text-[13px] gap-1.5"
                onClick={() => setShowVersionHistory(true)}
                title="버전 히스토리"
              >
                <History className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="text-[13px] gap-1.5"
              onClick={() => setShowTemplates(true)}
              title="템플릿"
            >
              <FileText className="h-3.5 w-3.5" />
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
            <div className="sticky top-14 z-50 overflow-visible bg-white border-b border-gray-200 -mx-6 px-2 py-1.5 mb-4">
              {/* Row 1: Text formatting - wraps so dropdowns are not clipped */}
              <div className="flex flex-wrap items-center gap-0.5 overflow-visible">
                {/* Undo / Redo */}
                <ToolbarButton icon={Undo2} label="실행취소" onClick={() => editor?.chain().focus().undo().run()} />
                <ToolbarButton icon={Redo2} label="다시실행" onClick={() => editor?.chain().focus().redo().run()} />
                <ToolbarSeparator />

                {/* Headings */}
                <ToolbarButton icon={Heading1} label="제목1" onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} active={editor?.isActive("heading", { level: 1 })} />
                <ToolbarButton icon={Heading2} label="제목2" onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} active={editor?.isActive("heading", { level: 2 })} />
                <ToolbarButton icon={Heading3} label="제목3" onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()} active={editor?.isActive("heading", { level: 3 })} />
                <ToolbarSeparator />

                {/* Font Family Dropdown */}
                <div className="relative overflow-visible">
                  <button
                    onClick={() => {
                      const next = !showFontFamily;
                      closeToolbarMenus();
                      setShowFontFamily(next);
                    }}
                    title="글꼴"
                    className="flex items-center gap-1 px-2 py-1.5 rounded text-gray-500 hover:bg-gray-100 hover:text-gray-700 text-[12px]"
                  >
                    <Type className="h-3.5 w-3.5" />
                    <span className="font-medium">글꼴</span>
                    <ChevronDown className="h-3 w-3" />
                  </button>
                  {showFontFamily && (
                    <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-[70] w-52 max-h-72 overflow-y-auto">
                      {FONT_FAMILIES.map((font) => (
                        <button
                          key={font.value}
                          onClick={() => setFontFamily(font.value)}
                          className="w-full text-left px-3 py-2 text-[12px] hover:bg-gray-100"
                          style={{ fontFamily: font.css }}
                        >
                          <span className="block text-gray-900">{font.label}</span>
                          {font.description && (
                            <span className="block text-[10px] text-gray-400">{font.description}</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Font Size Dropdown */}
                <div className="relative overflow-visible">
                  <button
                    onClick={() => {
                      const next = !showFontSize;
                      closeToolbarMenus();
                      setShowFontSize(next);
                    }}
                    title="글자 크기"
                    className="flex items-center gap-0.5 px-1.5 py-1.5 rounded text-gray-500 hover:bg-gray-100 hover:text-gray-700 text-[12px]"
                  >
                    <Type className="h-3.5 w-3.5" />
                    <ChevronDown className="h-3 w-3" />
                  </button>
                  {showFontSize && (
                    <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-[70] w-32">
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
                <div className="relative overflow-visible">
                  <button
                    onClick={() => {
                      const next = !showColorPicker;
                      closeToolbarMenus();
                      setShowColorPicker(next);
                    }}
                    title="글자색"
                    className="flex items-center gap-0.5 px-1.5 py-1.5 rounded text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                  >
                    <Palette className="h-4 w-4" />
                    <ChevronDown className="h-3 w-3" />
                  </button>
                  {showColorPicker && (
                    <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg p-3 z-[70] min-w-[200px]">
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
                <div className="relative overflow-visible">
                  <button
                    onClick={() => {
                      const next = !showHighlightPicker;
                      closeToolbarMenus();
                      setShowHighlightPicker(next);
                    }}
                    title="형광펜"
                    className="flex items-center gap-0.5 px-1.5 py-1.5 rounded text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                  >
                    <Highlighter className="h-4 w-4" />
                    <ChevronDown className="h-3 w-3" />
                  </button>
                  {showHighlightPicker && (
                    <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg p-3 z-[70] min-w-[200px]">
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
                <div className="relative overflow-visible">
                  <button
                    onClick={() => {
                      const next = !showLineHeight;
                      closeToolbarMenus();
                      setShowLineHeight(next);
                    }}
                    title="줄 간격"
                    className="flex items-center gap-0.5 px-1.5 py-1.5 rounded text-gray-500 hover:bg-gray-100 hover:text-gray-700 text-[11px]"
                  >
                    <span className="text-[11px] font-medium">줄</span>
                    <ChevronDown className="h-3 w-3" />
                  </button>
                  {showLineHeight && (
                    <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-[70] w-28">
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
                <div className="relative overflow-visible">
                  <button
                    onClick={() => {
                      const next = !showLetterSpacing;
                      closeToolbarMenus();
                      setShowLetterSpacing(next);
                    }}
                    title="자간"
                    className="flex items-center gap-0.5 px-1.5 py-1.5 rounded text-gray-500 hover:bg-gray-100 hover:text-gray-700 text-[11px]"
                  >
                    <span className="text-[11px] font-medium">자</span>
                    <ChevronDown className="h-3 w-3" />
                  </button>
                  {showLetterSpacing && (
                    <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-[70] w-28">
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
                {/* Bullet Style */}
                <div className="relative overflow-visible">
                  <button
                    onClick={() => {
                      const next = !showBulletStyle;
                      closeToolbarMenus();
                      setShowBulletStyle(next);
                    }}
                    title="글머리 스타일"
                    className="flex items-center gap-0.5 px-1.5 py-1.5 rounded text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                  >
                    <CircleDot className="h-3.5 w-3.5" />
                    <ChevronDown className="h-3 w-3" />
                  </button>
                  {showBulletStyle && (
                    <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-[70] w-40">
                      <button onClick={() => { editor?.chain().focus().toggleBulletList().run(); setShowBulletStyle(false); }} className="w-full text-left px-3 py-2 text-[12px] hover:bg-gray-100 flex items-center gap-2">
                        <CircleDot className="h-3.5 w-3.5" /> ● 원형 (기본)
                      </button>
                      <button onClick={() => { editor?.chain().focus().toggleBulletList().run(); setShowBulletStyle(false); }} className="w-full text-left px-3 py-2 text-[12px] hover:bg-gray-100 flex items-center gap-2">
                        <Square className="h-3.5 w-3.5" /> ■ 사각형
                      </button>
                      <button onClick={() => { editor?.chain().focus().toggleBulletList().run(); setShowBulletStyle(false); }} className="w-full text-left px-3 py-2 text-[12px] hover:bg-gray-100 flex items-center gap-2">
                        <Triangle className="h-3.5 w-3.5" /> ▶ 삼각형
                      </button>
                      <button onClick={() => { editor?.chain().focus().toggleBulletList().run(); setShowBulletStyle(false); }} className="w-full text-left px-3 py-2 text-[12px] hover:bg-gray-100 flex items-center gap-2">
                        <Minus className="h-3.5 w-3.5" /> — 대시
                      </button>
                    </div>
                  )}
                </div>
                <ToolbarButton icon={Indent} label="들여쓰기" onClick={handleIndent} />
                <ToolbarButton icon={Outdent} label="내어쓰기" onClick={handleOutdent} />
                <ToolbarSeparator />

                {/* Block elements */}
                <div className="relative overflow-visible">
                  <button
                    onClick={() => {
                      const next = !showQuoteStyles;
                      closeToolbarMenus();
                      setShowQuoteStyles(next);
                    }}
                    title="인용구 스타일"
                    className={`flex items-center gap-0.5 px-1.5 py-1.5 rounded transition-colors ${editor?.isActive("quoteBlock") || editor?.isActive("blockquote") ? "bg-gray-200 text-gray-900" : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"}`}
                  >
                    <Quote className="h-4 w-4" />
                    <ChevronDown className="h-3 w-3" />
                  </button>
                  {showQuoteStyles && (
                    <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg p-2 z-[70] w-64">
                      {QUOTE_STYLES.map((style) => (
                        <button
                          key={style.value}
                          onClick={() => insertQuoteStyle(style)}
                          className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-gray-50"
                        >
                          <span className="block text-[12px] font-medium text-gray-900">{style.label}</span>
                          <span className="block text-[11px] text-gray-400 mb-2">{style.description}</span>
                          <span
                            className="block text-[12px] text-gray-700"
                            style={style.previewStyle}
                          >
                            {style.value === "quotation" ? "“ 인용문 미리보기" : "인용문 미리보기"}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <ToolbarButton icon={Code} label="코드" onClick={() => editor?.chain().focus().toggleCodeBlock().run()} active={editor?.isActive("codeBlock")} />
                <ToolbarButton icon={Minus} label="구분선" onClick={() => editor?.chain().focus().setHorizontalRule().run()} />
                <ToolbarSeparator />

                {/* Media & Insert */}
                <ToolbarButton icon={ImageIcon} label="이미지" onClick={handleImageSelect} />
                <button
                  onClick={insertCaption}
                  title="이미지 캡션"
                  className="px-1.5 py-1.5 rounded text-gray-500 hover:bg-gray-100 hover:text-gray-700 text-[11px] font-medium"
                >
                  Aa
                </button>
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

                {/* SEO Meta */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-[13px] text-gray-700">SEO 설정</Label>
                    <button onClick={() => setShowSeoPanel(!showSeoPanel)} className="text-[11px] text-blue-600 hover:underline">
                      {showSeoPanel ? '접기' : '펼치기'}
                    </button>
                  </div>
                  {showSeoPanel && (
                    <div className="space-y-2 p-3 bg-white border border-gray-200 rounded-lg">
                      <div>
                        <label className="text-[11px] text-gray-500 block mb-1">검색 제목 (meta title)</label>
                        <Input
                          value={seoTitle}
                          onChange={(e) => setSeoTitle(e.target.value)}
                          placeholder={title || "제목과 동일"}
                          className="text-[12px] h-8"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-gray-500 block mb-1">검색 설명 (meta description)</label>
                        <Textarea
                          value={seoDescription}
                          onChange={(e) => setSeoDescription(e.target.value)}
                          placeholder={excerpt || "요약문과 동일"}
                          rows={2}
                          className="text-[12px] resize-none"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-gray-500 block mb-1">OG 이미지 URL</label>
                        <Input
                          value={ogImageUrl}
                          onChange={(e) => setOgImageUrl(e.target.value)}
                          placeholder={thumbnailUrl || "썸네일과 동일"}
                          className="text-[12px] h-8"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Preview Link */}
                {editId && (
                  <div className="space-y-1.5">
                    <Label className="text-[13px] text-gray-700">미리보기 링크</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-[12px]"
                      onClick={() => {
                        if (editId) generatePreviewToken.mutate({ contentId: editId });
                      }}
                      disabled={generatePreviewToken.isPending}
                    >
                      <Share2 className="h-3.5 w-3.5 mr-1.5" /> {generatePreviewToken.isPending ? '생성 중...' : '미리보기 링크 생성'}
                    </Button>
                  </div>
                )}

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
      {(showColorPicker || showHighlightPicker || showFontFamily || showFontSize || showLineHeight || showLetterSpacing || showBulletStyle || showQuoteStyles) && (
        <div
          className="fixed inset-0 z-[5]"
          onClick={closeToolbarMenus}
        />
      )}

      <Dialog open={Boolean(textPrompt)} onOpenChange={(open) => { if (!open) setTextPrompt(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{textPrompt?.title}</DialogTitle>
            <DialogDescription>{textPrompt?.description}</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              handleTextPromptSubmit();
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="editor-text-prompt">{textPrompt?.label}</Label>
              <Input
                id="editor-text-prompt"
                value={textPromptValue}
                onChange={(event) => setTextPromptValue(event.target.value)}
                placeholder={textPrompt?.placeholder}
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setTextPrompt(null)}>
                취소
              </Button>
              <Button type="submit">
                {textPrompt?.confirmLabel ?? "적용"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(editor?.getHTML() || "") }}
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

      {/* Version History Modal */}
      {showVersionHistory && editId && (
        <VersionHistoryModal contentId={editId} onClose={() => setShowVersionHistory(false)} onRestore={(body) => { if (editor) editor.commands.setContent(body); setShowVersionHistory(false); toast.success("선택한 버전으로 복원했습니다."); }} />
      )}

      {/* Templates Modal */}
      {showTemplates && (
        <TemplatesModal onClose={() => setShowTemplates(false)} onInsert={(body) => { if (editor) editor.commands.setContent(body); setShowTemplates(false); toast.success("템플릿이 적용되었습니다."); }} currentBody={editor?.getHTML() || ""} currentTitle={title} />
      )}

      {/* Preview Link Modal */}
      {previewToken && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">미리보기 링크</h2>
              <button onClick={() => setPreviewToken(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-3">이 링크를 공유하면 발행 전에도 콘텐츠를 미리 확인할 수 있습니다.</p>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={`${window.location.origin}/preview/${previewToken}`}
                className="text-[12px] bg-gray-50"
              />
              <Button
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/preview/${previewToken}`);
                  toast.success("링크가 복사되었습니다.");
                }}
              >
                복사
              </Button>
            </div>
            <p className="text-[11px] text-gray-400 mt-2">* 이 링크는 48시간 동안 유효합니다.</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Toolbar Constants ───────────────────────────
type QuoteStyle = {
  value: string;
  label: string;
  description: string;
  css: string;
  previewStyle: CSSProperties;
};

const FONT_FAMILIES = [
  {
    label: "기본",
    value: "default",
    css: undefined,
    description: "사이트 기본 글꼴",
  },
  {
    label: "Pretendard",
    value: "Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
    css: "Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
    description: "깔끔한 본문용",
  },
  {
    label: "나눔고딕",
    value: "'Nanum Gothic', 'Malgun Gothic', sans-serif",
    css: "'Nanum Gothic', 'Malgun Gothic', sans-serif",
    description: "익숙한 고딕체",
  },
  {
    label: "Noto Sans KR",
    value: "'Noto Sans KR', 'Malgun Gothic', sans-serif",
    css: "'Noto Sans KR', 'Malgun Gothic', sans-serif",
    description: "가독성 중심",
  },
  {
    label: "맑은 고딕",
    value: "'Malgun Gothic', sans-serif",
    css: "'Malgun Gothic', sans-serif",
    description: "윈도우 기본",
  },
  {
    label: "나눔명조",
    value: "'Nanum Myeongjo', 'Noto Serif KR', serif",
    css: "'Nanum Myeongjo', 'Noto Serif KR', serif",
    description: "칼럼/에세이 느낌",
  },
  {
    label: "Georgia",
    value: "Georgia, 'Times New Roman', serif",
    css: "Georgia, 'Times New Roman', serif",
    description: "영문 세리프",
  },
  {
    label: "Courier New",
    value: "'Courier New', monospace",
    css: "'Courier New', monospace",
    description: "고정폭",
  },
];

const QUOTE_STYLES: QuoteStyle[] = [
  {
    value: "basic",
    label: "기본 인용문",
    description: "일반 블록 인용",
    css: "",
    previewStyle: {
      borderLeft: "3px solid #d1d5db",
      color: "#6b7280",
      paddingLeft: "12px",
    },
  },
  {
    value: "quotation",
    label: "따옴표",
    description: "큰 따옴표로 핵심 문장 강조",
    css: "",
    previewStyle: {
      position: "relative",
      padding: "10px 12px 10px 28px",
      color: "#4b5563",
      fontWeight: 600,
    },
  },
  {
    value: "vertical-line",
    label: "버티컬 라인",
    description: "왼쪽 선으로 강조",
    css: "border-left: 4px solid #2B3A4E; padding: 12px 16px; margin: 20px 0; background: #f8fafc; color: #1f2937;",
    previewStyle: {
      borderLeft: "4px solid #2B3A4E",
      padding: "10px 12px",
      background: "#f8fafc",
    },
  },
  {
    value: "speech-bubble",
    label: "말풍선",
    description: "코멘트/대화형 강조",
    css: "border: 1px solid #d1d5db; border-radius: 12px; padding: 14px 16px; margin: 20px 0; background: #ffffff; box-shadow: 0 8px 20px rgba(15, 23, 42, 0.06); color: #1f2937;",
    previewStyle: {
      border: "1px solid #d1d5db",
      borderRadius: "12px",
      padding: "10px 12px",
      boxShadow: "0 8px 20px rgba(15, 23, 42, 0.06)",
    },
  },
  {
    value: "quote-line",
    label: "라인 & 따옴표",
    description: "프리미엄 콘텐츠형 인용",
    css: "border-top: 1px solid #d1d5db; border-bottom: 1px solid #d1d5db; padding: 18px 20px; margin: 24px 0; color: #374151; font-size: 18px; font-weight: 600;",
    previewStyle: {
      borderTop: "1px solid #d1d5db",
      borderBottom: "1px solid #d1d5db",
      padding: "10px 12px",
      fontWeight: 600,
    },
  },
  {
    value: "post-it",
    label: "포스트잇",
    description: "메모/주의사항 강조",
    css: "border: 1px solid #fde68a; border-radius: 8px; padding: 14px 16px; margin: 20px 0; background: #fffbeb; color: #713f12;",
    previewStyle: {
      border: "1px solid #fde68a",
      borderRadius: "8px",
      padding: "10px 12px",
      background: "#fffbeb",
      color: "#713f12",
    },
  },
  {
    value: "frame",
    label: "프레임",
    description: "박스형 핵심 문장",
    css: "border: 2px solid #9ca3af; border-radius: 4px; padding: 16px 18px; margin: 22px 0; background: #ffffff; color: #111827;",
    previewStyle: {
      border: "2px solid #9ca3af",
      borderRadius: "4px",
      padding: "10px 12px",
    },
  },
];

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
      className={`p-2 rounded transition-colors flex-shrink-0 ${active ? "bg-gray-200 text-gray-900" : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"}`}
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
      const quoteText = p.replace(/^> /gm, "");
      return `<div data-quote-block data-quote-style="basic" class="quote-block quote-block-basic"><p>${quoteText}</p></div>`;
    }
    return `<p>${p.replace(/\n/g, "<br>")}</p>`;
  }).join("");
  return html;
}

function htmlToMarkdown(html: string): string {
  if (!html) return "";
  let md = html;
  // Quote blocks
  md = md.replace(/<div[^>]*data-quote-block[^>]*>([\s\S]*?)<\/div>/gi, (_, content) => {
    const text = content
      .replace(/<\/p>\s*<p[^>]*>/gi, "\n")
      .replace(/<\/?p[^>]*>/gi, "")
      .replace(/<[^>]+>/g, "")
      .trim();
    return text.split(/\n+/).map((line: string) => `> ${line}`).join("\n") + "\n\n";
  });
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

// ─── Version History Modal ───────────────────────
function VersionHistoryModal({ contentId, onClose, onRestore }: { contentId: number; onClose: () => void; onRestore: (body: string) => void }) {
  const { data: versions, isLoading } = trpc.admin.listVersions.useQuery({ contentId });

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2"><History className="h-5 w-5" /> 버전 히스토리</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="h-5 w-5 text-gray-500" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading && <p className="text-sm text-gray-500 text-center py-8">로딩 중...</p>}
          {!isLoading && (!versions || versions.length === 0) && (
            <p className="text-sm text-gray-500 text-center py-8">저장된 버전이 없습니다.<br />글을 수정하면 자동으로 버전이 저장됩니다.</p>
          )}
          {versions?.map((v: any) => (
            <div key={v.id} className="border border-gray-200 rounded-lg p-3 mb-2 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-800">{v.versionTitle || '제목 없음'}</p>
                  <p className="text-[11px] text-gray-400">{new Date(v.createdAt).toLocaleString('ko-KR')}</p>
                </div>
                <Button size="sm" variant="outline" className="text-[11px]" onClick={() => onRestore(v.body)}>
                  복원
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Templates Modal ───────────────────────
function TemplatesModal({ onClose, onInsert, currentBody, currentTitle }: { onClose: () => void; onInsert: (body: string) => void; currentBody: string; currentTitle: string }) {
  const { data: templates, isLoading } = trpc.admin.listTemplates.useQuery();
  const utils = trpc.useUtils();
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [templateName, setTemplateName] = useState(currentTitle || "내 템플릿");
  const createTemplate = trpc.admin.createTemplate.useMutation({
    onSuccess: () => { utils.admin.listTemplates.invalidate(); toast.success("템플릿이 저장되었습니다."); setShowSaveDialog(false); },
    onError: (err: any) => toast.error(err.message || "템플릿 저장 실패"),
  });
  const deleteTemplate = trpc.admin.deleteTemplate.useMutation({
    onSuccess: () => { utils.admin.listTemplates.invalidate(); toast.success("템플릿이 삭제되었습니다."); },
  });

  const handleSaveAsTemplate = () => {
    const name = templateName.trim();
    if (!name) {
      toast.error("템플릿 이름을 입력해주세요.");
      return;
    }
    createTemplate.mutate({ name, content: currentBody });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2"><FileText className="h-5 w-5" /> 템플릿</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="h-5 w-5 text-gray-500" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <Button variant="outline" className="w-full mb-4 text-[13px]" onClick={() => setShowSaveDialog(true)}>
            <Plus className="h-3.5 w-3.5 mr-1.5" /> 현재 글을 템플릿으로 저장
          </Button>
          {isLoading && <p className="text-sm text-gray-500 text-center py-8">로딩 중...</p>}
          {!isLoading && (!templates || templates.length === 0) && (
            <p className="text-sm text-gray-500 text-center py-8">저장된 템플릿이 없습니다.<br />현재 글을 템플릿으로 저장해보세요.</p>
          )}
          {templates?.map((t: any) => (
            <div key={t.id} className="border border-gray-200 rounded-lg p-3 mb-2 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-800">{t.name}</p>
                  <p className="text-[11px] text-gray-400">{new Date(t.createdAt).toLocaleString('ko-KR')}</p>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" className="text-[11px]" onClick={() => onInsert(t.content)}>
                    적용
                  </Button>
                  <Button size="sm" variant="ghost" className="text-[11px] text-red-500 hover:text-red-700" onClick={() => deleteTemplate.mutate({ id: t.id })}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>템플릿 저장</DialogTitle>
            <DialogDescription>현재 글을 다시 사용할 수 있는 템플릿으로 저장합니다.</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              handleSaveAsTemplate();
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="template-name">템플릿 이름</Label>
              <Input
                id="template-name"
                value={templateName}
                onChange={(event) => setTemplateName(event.target.value)}
                placeholder="내 템플릿"
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowSaveDialog(false)}>
                취소
              </Button>
              <Button type="submit" disabled={createTemplate.isPending}>
                저장
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Streamdown } from "streamdown";
import {
  Bold, Italic, Heading1, Heading2, Heading3, List, ListOrdered,
  Quote, Code, Link as LinkIcon, Image, Minus, Eye, Edit3
} from "lucide-react";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minRows?: number;
}

export default function MarkdownEditor({ value, onChange, placeholder, minRows = 15 }: MarkdownEditorProps) {
  const [mode, setMode] = useState<"write" | "preview">("write");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertMarkdown = useCallback((prefix: string, suffix: string = "", defaultText: string = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end) || defaultText;
    const before = value.substring(0, start);
    const after = value.substring(end);

    const newValue = `${before}${prefix}${selectedText}${suffix}${after}`;
    onChange(newValue);

    // Restore cursor position
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + prefix.length + selectedText.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  }, [value, onChange]);

  const toolbarActions = [
    { icon: Bold, label: "굵게", action: () => insertMarkdown("**", "**", "굵은 텍스트") },
    { icon: Italic, label: "기울임", action: () => insertMarkdown("*", "*", "기울임 텍스트") },
    { icon: Heading1, label: "제목1", action: () => insertMarkdown("\n# ", "\n", "제목") },
    { icon: Heading2, label: "제목2", action: () => insertMarkdown("\n## ", "\n", "제목") },
    { icon: Heading3, label: "제목3", action: () => insertMarkdown("\n### ", "\n", "제목") },
    null, // separator
    { icon: List, label: "목록", action: () => insertMarkdown("\n- ", "\n", "항목") },
    { icon: ListOrdered, label: "번호 목록", action: () => insertMarkdown("\n1. ", "\n", "항목") },
    { icon: Quote, label: "인용", action: () => insertMarkdown("\n> ", "\n", "인용문") },
    { icon: Code, label: "코드", action: () => insertMarkdown("`", "`", "코드") },
    null, // separator
    { icon: LinkIcon, label: "링크", action: () => insertMarkdown("[", "](url)", "링크 텍스트") },
    { icon: Image, label: "이미지", action: () => insertMarkdown("![", "](이미지URL)", "이미지 설명") },
    { icon: Minus, label: "구분선", action: () => insertMarkdown("\n---\n") },
  ];

  return (
    <div className="border rounded-lg overflow-hidden bg-background">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b bg-muted/30 px-2 py-1.5">
        <div className="flex items-center gap-0.5 flex-wrap">
          {toolbarActions.map((item, i) =>
            item === null ? (
              <div key={`sep-${i}`} className="w-px h-5 bg-border mx-1" />
            ) : (
              <Button
                key={item.label}
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={item.action}
                title={item.label}
              >
                <item.icon className="h-3.5 w-3.5" />
              </Button>
            )
          )}
        </div>
        <Tabs value={mode} onValueChange={(v) => setMode(v as "write" | "preview")}>
          <TabsList className="h-7">
            <TabsTrigger value="write" className="text-xs gap-1 px-2 h-6">
              <Edit3 className="h-3 w-3" /> 작성
            </TabsTrigger>
            <TabsTrigger value="preview" className="text-xs gap-1 px-2 h-6">
              <Eye className="h-3 w-3" /> 미리보기
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Editor / Preview */}
      {mode === "write" ? (
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? "마크다운으로 작성하세요..."}
          rows={minRows}
          className="border-0 rounded-none focus-visible:ring-0 font-mono text-sm resize-y"
        />
      ) : (
        <div className="p-4 min-h-[300px] prose prose-sm max-w-none dark:prose-invert">
          {value ? (
            <Streamdown>{value}</Streamdown>
          ) : (
            <p className="text-muted-foreground italic">미리보기할 내용이 없습니다.</p>
          )}
        </div>
      )}
    </div>
  );
}

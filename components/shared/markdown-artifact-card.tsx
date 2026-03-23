"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { marked } from "marked";
import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";

type Artifact = {
  name: string;
  relativePath: string;
  excerpt?: string;
  updatedAt?: string;
};

type MarkdownArtifactCardProps = {
  artifact: Artifact;
  className?: string;
};

const turndownService = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  bulletListMarker: "-",
});
turndownService.use(gfm);
marked.setOptions({
  gfm: true,
  breaks: true,
});

function markdownToHtml(markdown: string): string {
  return marked.parse(markdown || "", { async: false }) as string;
}

function htmlToMarkdown(html: string): string {
  return turndownService.turndown(html || "");
}

function applyWrap(
  text: string,
  start: number,
  end: number,
  prefix: string,
  suffix = ""
): { value: string; cursorStart: number; cursorEnd: number } {
  const selected = text.slice(start, end);
  const replacement = `${prefix}${selected}${suffix}`;
  const next = `${text.slice(0, start)}${replacement}${text.slice(end)}`;
  const innerStart = start + prefix.length;
  const innerEnd = innerStart + selected.length;
  return { value: next, cursorStart: innerStart, cursorEnd: innerEnd };
}

export function MarkdownArtifactCard({ artifact, className }: MarkdownArtifactCardProps) {
  const isMarkdown = useMemo(() => artifact.name.toLowerCase().endsWith(".md"), [artifact.name]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [content, setContent] = useState("");
  const [editorHtml, setEditorHtml] = useState("");
  const [mode, setMode] = useState<"wysiwyg" | "source">("wysiwyg");
  const [message, setMessage] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  const loadContent = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch(
        `/api/markdown?relativePath=${encodeURIComponent(artifact.relativePath)}`,
        { cache: "no-store" }
      );
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "加载失败");
      }
      const md = payload.data.content || "";
      setContent(md);
      setEditorHtml(markdownToHtml(md));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "加载失败");
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = async () => {
    if (!isMarkdown) return;
    setOpen(true);
    await loadContent();
  };

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const saveContent = async () => {
    const saveMarkdown =
      mode === "source" ? content : htmlToMarkdown(editorRef.current?.innerHTML || editorHtml);
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch("/api/markdown", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          relativePath: artifact.relativePath,
          content: saveMarkdown,
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "保存失败");
      }
      setContent(saveMarkdown);
      setEditorHtml(markdownToHtml(saveMarkdown));
      setMessage("已保存");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const focusEditor = () => {
    editorRef.current?.focus();
  };

  const applySourceSelection = (
    formatter: (
      value: string,
      start: number,
      end: number
    ) => { value: string; cursorStart: number; cursorEnd: number }
  ) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? 0;
    const next = formatter(content, start, end);
    setContent(next.value);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(next.cursorStart, next.cursorEnd);
    });
  };

  const doHeading = (level: 1 | 2) => {
    if (mode === "source") {
      const prefix = level === 1 ? "# " : "## ";
      applySourceSelection((v, s, e) => applyWrap(v, s, e, prefix));
      return;
    }
    focusEditor();
    document.execCommand("formatBlock", false, level === 1 ? "h1" : "h2");
  };

  const doBold = () => {
    if (mode === "source") {
      applySourceSelection((v, s, e) => applyWrap(v, s, e, "**", "**"));
      return;
    }
    focusEditor();
    document.execCommand("bold");
  };

  const doItalic = () => {
    if (mode === "source") {
      applySourceSelection((v, s, e) => applyWrap(v, s, e, "*", "*"));
      return;
    }
    focusEditor();
    document.execCommand("italic");
  };

  const doCode = () => {
    if (mode === "source") {
      applySourceSelection((v, s, e) => applyWrap(v, s, e, "`", "`"));
      return;
    }
    focusEditor();
    document.execCommand("insertHTML", false, "<code>code</code>");
  };

  const doList = () => {
    if (mode === "source") {
      applySourceSelection((v, s, e) => applyWrap(v, s, e, "- "));
      return;
    }
    focusEditor();
    document.execCommand("insertUnorderedList");
  };

  const doQuote = () => {
    if (mode === "source") {
      applySourceSelection((v, s, e) => applyWrap(v, s, e, "> "));
      return;
    }
    focusEditor();
    document.execCommand("formatBlock", false, "blockquote");
  };

  const doLink = () => {
    const url = window.prompt("输入链接地址", "https://");
    if (!url) return;
    if (mode === "source") {
      applySourceSelection((v, s, e) => applyWrap(v, s, e, "[", `](${url})`));
      return;
    }
    focusEditor();
    document.execCommand("createLink", false, url);
  };

  const doUndo = () => {
    if (mode === "source") return;
    focusEditor();
    document.execCommand("undo");
  };

  const doRedo = () => {
    if (mode === "source") return;
    focusEditor();
    document.execCommand("redo");
  };

  const toolbar = [
    { label: "H1", action: () => doHeading(1) },
    { label: "H2", action: () => doHeading(2) },
    { label: "B", action: doBold },
    { label: "I", action: doItalic },
    { label: "Code", action: doCode },
    { label: "UL", action: doList },
    { label: "Quote", action: doQuote },
    { label: "Link", action: doLink },
    { label: "Undo", action: doUndo },
    { label: "Redo", action: doRedo },
  ];

  const cardContent = (
    <>
      <p className="font-medium">{artifact.name}</p>
      <p className="text-xs text-muted-foreground">{artifact.relativePath}</p>
      {artifact.excerpt ? (
        <p className="text-sm text-muted-foreground">{artifact.excerpt}</p>
      ) : null}
      {artifact.updatedAt ? (
        <p className="text-xs text-muted-foreground">
          {new Date(artifact.updatedAt).toLocaleString("zh-CN")}
        </p>
      ) : null}
    </>
  );

  if (!isMarkdown) {
    return (
      <div
        className={
          className ||
          "space-y-1 rounded-2xl border border-border/80 bg-background/80 p-3 text-left"
        }
      >
        {cardContent}
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        className={
          className ||
          "w-full space-y-1 rounded-2xl border border-border/80 bg-background/80 p-3 text-left transition-colors hover:border-primary/30 hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        }
        onClick={handleOpen}
      >
        {cardContent}
      </button>

      {open && (
        <div className="admin-overlay-fixed">
          <div
            className="admin-modal-surface flex h-[86vh] w-[96vw] max-w-7xl flex-col rounded-[28px]"
            role="dialog"
            aria-modal="true"
            aria-label="Markdown Editor Dialog"
          >
            <div className="flex items-center justify-between border-b border-border/80 px-4 py-3">
              <div>
                <p className="text-sm font-semibold">Markdown 编辑器</p>
                <p className="text-xs text-muted-foreground">{artifact.relativePath}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant={mode === "wysiwyg" ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    if (mode === "source") {
                      setEditorHtml(markdownToHtml(content));
                      setMode("wysiwyg");
                      setMessage("已切换到所见即所得模式");
                      return;
                    }
                    const next = htmlToMarkdown(editorRef.current?.innerHTML || editorHtml);
                    setContent(next);
                    setMode("source");
                    setMessage("已切换到源码模式");
                  }}
                >
                  {mode === "wysiwyg" ? "切换到源码模式" : "切换到所见即所得"}
                </Button>
                <Button variant="outline" size="sm" onClick={loadContent} disabled={loading}>
                  刷新
                </Button>
                <Button size="sm" onClick={saveContent} disabled={saving || loading}>
                  {saving ? "保存中..." : "保存"}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
                  关闭
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 border-b border-border/80 bg-secondary/35 px-4 py-2">
              {toolbar.map((item) => (
                <Button key={item.label} variant="outline" size="sm" onClick={item.action}>
                  {item.label}
                </Button>
              ))}
            </div>

            <div className="flex-1 overflow-hidden p-4">
              {mode === "source" ? (
                <div className="h-full overflow-hidden rounded-2xl border border-border/80 bg-background/80">
                  <Textarea
                    ref={textareaRef}
                    value={content}
                    onKeyDown={(e) => {
                      if (!(e.metaKey || e.ctrlKey)) return;
                      const key = e.key.toLowerCase();
                      if (key === "b") {
                        e.preventDefault();
                        doBold();
                      }
                      if (key === "i") {
                        e.preventDefault();
                        doItalic();
                      }
                      if (key === "k") {
                        e.preventDefault();
                        doLink();
                      }
                    }}
                    onChange={(e) => setContent(e.target.value)}
                    className="h-full min-h-full resize-none border-0 bg-transparent font-mono text-sm"
                  />
                </div>
              ) : (
                <ScrollArea className="h-full rounded-2xl border border-border/80 bg-background/80">
                  <div
                    ref={editorRef}
                    contentEditable
                    suppressContentEditableWarning
                    onKeyDown={(e) => {
                      if (!(e.metaKey || e.ctrlKey)) return;
                      const key = e.key.toLowerCase();
                      if (key === "b") {
                        e.preventDefault();
                        doBold();
                      }
                      if (key === "i") {
                        e.preventDefault();
                        doItalic();
                      }
                      if (key === "k") {
                        e.preventDefault();
                        doLink();
                      }
                    }}
                    onInput={(e) => setEditorHtml((e.target as HTMLDivElement).innerHTML)}
                    className="prose prose-slate prose-sm min-h-full max-w-none p-4 outline-none dark:prose-invert"
                    dangerouslySetInnerHTML={{ __html: editorHtml }}
                  />
                </ScrollArea>
              )}
            </div>

            {message ? (
              <div className="border-t border-border/80 px-4 py-2 text-xs text-muted-foreground">
                {message}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </>
  );
}

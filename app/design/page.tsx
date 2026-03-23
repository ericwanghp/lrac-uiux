"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Download, Grid as GridIcon, Check, ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { MarkdownArtifactCard } from "@/components/shared/markdown-artifact-card";

const panelClassName = "admin-panel border-border/80 bg-card/90";
const softPanelClassName = "rounded-2xl border border-border/80 bg-secondary/70";

interface PhaseSession {
  name: string;
  timestamp: string;
  role: string;
  executionItems: string[];
}

interface PhaseTaskLog {
  featureId: string;
  featureTitle: string;
  timestamp: string;
  action: string;
}

interface PhaseArtifact {
  name: string;
  relativePath: string;
  excerpt: string;
  updatedAt: string;
}

interface DesignPhaseData {
  phaseCompleted: boolean;
  sessions: PhaseSession[];
  taskLogs: PhaseTaskLog[];
  artifacts: {
    designDocs: PhaseArtifact[];
    stitchDocs: PhaseArtifact[];
    prototypes: PhaseArtifact[];
  };
}

type DesignAssetOption = {
  id: string;
  name: string;
  filename: string;
};

function isPreviewableDesign(name: string) {
  return [".png", ".jpg", ".jpeg", ".webp"].some((ext) => name.toLowerCase().endsWith(ext));
}

function toDesignOption(fileName: string): DesignAssetOption {
  const ext = fileName.split(".").pop() || "";
  const baseName = ext ? fileName.slice(0, -(ext.length + 1)) : fileName;
  return {
    id: baseName,
    name: baseName
      .split(/[-_]/)
      .filter(Boolean)
      .map((segment) => segment[0]?.toUpperCase() + segment.slice(1))
      .join(" "),
    filename: fileName,
  };
}

export default function DesignViewerPage() {
  const [selectedDesign, setSelectedDesign] = useState<DesignAssetOption | null>(null);
  const [showGrid, setShowGrid] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHeightVh, setPreviewHeightVh] = useState(60);
  const [isResizingPreview, setIsResizingPreview] = useState(false);
  const imageRef = useRef<HTMLDivElement>(null);
  const resizeStartYRef = useRef(0);
  const resizeStartHeightRef = useRef(60);
  const [phaseData, setPhaseData] = useState<DesignPhaseData | null>(null);
  const [phaseError, setPhaseError] = useState<string | null>(null);
  const availableDesigns = (phaseData?.artifacts.prototypes || [])
    .filter((artifact) => isPreviewableDesign(artifact.name))
    .map((artifact) => toDesignOption(artifact.name));

  useEffect(() => {
    let cancelled = false;
    const loadPhaseData = async () => {
      try {
        const response = await fetch("/api/phase/design", { cache: "no-store" });
        const payload = await response.json();
        if (!response.ok || !payload.success) {
          throw new Error(payload.error || "Failed to load design phase data");
        }
        if (!cancelled) {
          setPhaseData(payload.data as DesignPhaseData);
        }
      } catch (error) {
        if (!cancelled) {
          setPhaseError(error instanceof Error ? error.message : "Failed to load phase data");
        }
      }
    };
    loadPhaseData();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPreviewOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  useEffect(() => {
    if (!isResizingPreview) return;
    const onMouseMove = (event: MouseEvent) => {
      const deltaY = event.clientY - resizeStartYRef.current;
      const deltaVh = (deltaY / window.innerHeight) * 100;
      const nextHeight = Math.min(85, Math.max(45, resizeStartHeightRef.current + deltaVh));
      setPreviewHeightVh(nextHeight);
    };
    const onMouseUp = () => {
      setIsResizingPreview(false);
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [isResizingPreview]);

  useEffect(() => {
    setSelectedDesign((current) => {
      if (current && availableDesigns.some((design) => design.id === current.id)) {
        return current;
      }
      return availableDesigns[0] ?? null;
    });
  }, [availableDesigns]);

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

  const handleDownload = () => {
    if (!selectedDesign) return;
    const link = document.createElement("a");
    link.href = `/api/design-assets?file=${encodeURIComponent(selectedDesign.filename)}`;
    link.download = selectedDesign.filename;
    link.click();
  };

  const getDesignAssetUrl = (fileName?: string) =>
    `/api/design-assets?file=${encodeURIComponent(fileName || "")}`;

  const navigateDesign = (direction: "prev" | "next") => {
    if (!selectedDesign) return;
    const currentIndex = availableDesigns.findIndex((d) => d.id === selectedDesign.id);
    const newIndex =
      direction === "prev"
        ? Math.max(0, currentIndex - 1)
        : Math.min(availableDesigns.length - 1, currentIndex + 1);
    setSelectedDesign(availableDesigns[newIndex] ?? null);
  };

  return (
    <div className="admin-page min-h-screen text-foreground">
      <div className="flex min-h-screen flex-col">
        <div className="order-4 grid grid-cols-1 gap-4 p-4 lg:grid-cols-3">
          <Card className={`${panelClassName} lg:col-span-2`}>
            <CardHeader>
              <CardTitle>设计阶段执行日志</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-44 pr-4">
                <div className="space-y-3">
                  {phaseError ? (
                    <p className="text-sm text-destructive">{phaseError}</p>
                  ) : !phaseData ? (
                    <p className="text-sm text-muted-foreground">正在加载设计阶段日志...</p>
                  ) : phaseData.sessions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">暂无设计阶段会话日志</p>
                  ) : (
                    phaseData.sessions.map((session) => (
                      <div
                        key={`${session.name}-${session.timestamp}`}
                        className={`${softPanelClassName} p-3`}
                      >
                        <div className="mb-1 flex items-center justify-between">
                          <p className="text-sm font-medium text-foreground">{session.name}</p>
                          <Badge
                            variant="outline"
                            className="border-border/80 text-muted-foreground"
                          >
                            {session.role}
                          </Badge>
                        </div>
                        <p className="mb-2 text-xs text-muted-foreground">
                          {formatTime(session.timestamp)}
                        </p>
                        <ul className="space-y-1 text-xs text-muted-foreground">
                          {session.executionItems.slice(0, 3).map((item, index) => (
                            <li key={`${session.name}-item-${index}`}>• {item}</li>
                          ))}
                        </ul>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card className={panelClassName}>
            <CardHeader>
              <CardTitle>AI Coding / IDE 日志</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-44 pr-4">
                <div className="space-y-3">
                  {phaseError ? (
                    <p className="text-sm text-destructive">{phaseError}</p>
                  ) : !phaseData ? (
                    <p className="text-sm text-muted-foreground">正在加载工具日志...</p>
                  ) : phaseData.taskLogs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">暂无工具日志</p>
                  ) : (
                    phaseData.taskLogs.map((log, index) => (
                      <div
                        key={`${log.featureId}-${log.timestamp}-${index}`}
                        className={`${softPanelClassName} p-3`}
                      >
                        <p className="text-xs font-medium text-foreground">{log.featureId}</p>
                        <p className="text-xs text-muted-foreground">{formatTime(log.timestamp)}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{log.action}</p>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        <div className="order-5 grid grid-cols-1 gap-4 px-4 pb-4 lg:grid-cols-3">
          <Card className={panelClassName}>
            <CardHeader>
              <CardTitle>设计文档</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {!phaseData ? (
                <p className="text-sm text-muted-foreground">正在加载...</p>
              ) : phaseData.artifacts.designDocs.length === 0 ? (
                <p className="text-sm text-muted-foreground">暂无设计文档</p>
              ) : (
                phaseData.artifacts.designDocs
                  .slice(0, 5)
                  .map((artifact) => (
                    <MarkdownArtifactCard
                      key={artifact.relativePath}
                      artifact={artifact}
                      className="w-full rounded-2xl border border-border/80 bg-secondary/70 p-2 text-left"
                    />
                  ))
              )}
            </CardContent>
          </Card>

          <Card className={panelClassName}>
            <CardHeader>
              <CardTitle>设计系统产出</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {!phaseData ? (
                <p className="text-sm text-muted-foreground">正在加载...</p>
              ) : phaseData.artifacts.stitchDocs.length === 0 ? (
                <p className="text-sm text-muted-foreground">暂无设计系统文档</p>
              ) : (
                phaseData.artifacts.stitchDocs.map((artifact) => (
                  <MarkdownArtifactCard
                    key={artifact.relativePath}
                    artifact={artifact}
                    className="w-full rounded-2xl border border-border/80 bg-secondary/70 p-2 text-left"
                  />
                ))
              )}
            </CardContent>
          </Card>

          <Card className={panelClassName}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>交互稿产出</CardTitle>
                <Badge
                  variant={phaseData?.phaseCompleted ? "success" : "secondary"}
                  className="text-xs"
                >
                  {phaseData?.phaseCompleted ? "已完成" : "进行中"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {!phaseData ? (
                <p className="text-sm text-muted-foreground">正在加载...</p>
              ) : phaseData.artifacts.prototypes.length === 0 ? (
                <p className="text-sm text-muted-foreground">暂无交互稿</p>
              ) : (
                phaseData.artifacts.prototypes
                  .slice(0, 8)
                  .map((artifact) => (
                    <MarkdownArtifactCard
                      key={artifact.relativePath}
                      artifact={artifact}
                      className="w-full rounded-2xl border border-border/80 bg-secondary/70 p-2 text-left"
                    />
                  ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Header */}
        <div className="admin-topbar order-1 flex items-center justify-between border-b border-border/80 px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <button
                type="button"
                className="cursor-pointer rounded-sm text-left transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                onClick={() => (window.location.href = "/")}
              >
                Designs
              </button>
              <ChevronRight className="h-4 w-4" />
              <span className="text-foreground">
                {selectedDesign?.name || "No previewable design"}
              </span>
            </div>

            {/* Version selector */}
            <select
              value={selectedDesign?.id || ""}
              onChange={(e) => {
                const design = availableDesigns.find((d) => d.id === e.target.value);
                if (design) {
                  setSelectedDesign(design);
                }
              }}
              className="rounded-xl border border-border/80 bg-background/80 px-3 py-1.5 text-sm text-foreground"
              disabled={availableDesigns.length === 0}
            >
              {availableDesigns.length === 0 ? <option value="">No image assets</option> : null}
              {availableDesigns.map((design) => (
                <option key={design.id} value={design.id}>
                  {design.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            {/* View Controls */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowGrid(!showGrid)}
              className={cn(showGrid && "bg-primary/15 text-primary")}
            >
              <GridIcon className="h-4 w-4" />
            </Button>

            <div className="mx-2 h-6 w-px bg-border" />

            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
            <Button className="gradient-primary text-white" size="sm">
              <Check className="mr-2 h-4 w-4" />
              Approve
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div
          className="order-2 flex overflow-hidden"
          style={{ height: `${previewHeightVh}vh`, minHeight: "432px" }}
        >
          {/* Navigation Arrows */}
          <div className="flex flex-col items-center justify-center px-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigateDesign("prev")}
              disabled={
                !selectedDesign ||
                availableDesigns.findIndex((d) => d.id === selectedDesign.id) === 0
              }
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </div>

          {/* Image Viewer */}
          <div className="relative flex-1 overflow-hidden rounded-[28px] border border-border/80 bg-card/60 shadow-2xl">
            <div className="flex h-full w-full items-center justify-center p-6">
              <div ref={imageRef} className="relative h-full w-full max-w-[1800px]">
                <div className="relative h-full w-full min-h-[432px]">
                  {selectedDesign ? (
                    <Image
                      src={getDesignAssetUrl(selectedDesign.filename)}
                      alt={selectedDesign.name || "Design"}
                      fill
                      sizes="(max-width: 1280px) 100vw, 80vw"
                      className={cn(
                        "cursor-zoom-in rounded-lg object-contain shadow-2xl",
                        showGrid && "bg-[url('/grid.png')]"
                      )}
                      onClick={() => setPreviewOpen(true)}
                      priority
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
                      当前项目下暂无可预览的设计图片
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Arrows */}
          <div className="flex flex-col items-center justify-center px-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigateDesign("next")}
              disabled={
                !selectedDesign ||
                availableDesigns.findIndex((d) => d.id === selectedDesign.id) ===
                  availableDesigns.length - 1
              }
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="order-3 px-4">
          <div
            role="separator"
            aria-label="调整预览区高度"
            onMouseDown={(event) => {
              resizeStartYRef.current = event.clientY;
              resizeStartHeightRef.current = previewHeightVh;
              setIsResizingPreview(true);
            }}
            className="group flex h-6 cursor-row-resize items-center justify-center"
          >
            <div className="h-1 w-24 rounded-full bg-border transition-all group-hover:w-32 group-hover:bg-primary" />
          </div>
        </div>

        {previewOpen && (
          <div
            className="admin-overlay-fixed"
            onClick={() => setPreviewOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-label="Design Preview Dialog"
          >
            <button
              type="button"
              aria-label="Close preview"
              className="absolute right-6 top-6 rounded-md border border-border/80 bg-card/90 p-2 text-foreground hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              onClick={(event) => {
                event.stopPropagation();
                setPreviewOpen(false);
              }}
            >
              <X className="h-5 w-5" />
            </button>
            <div
              className="relative h-[88vh] w-[92vw] max-w-[1800px]"
              onClick={(event) => event.stopPropagation()}
            >
              <Image
                src={getDesignAssetUrl(selectedDesign?.filename)}
                alt={selectedDesign?.name || "Design"}
                fill
                sizes="92vw"
                className="rounded-lg object-contain"
                priority
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

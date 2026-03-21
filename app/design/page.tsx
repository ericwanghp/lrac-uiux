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

// Available designs from .stitch/designs/
const availableDesigns = [
  { id: "dashboard", name: "Dashboard", filename: "dashboard.png" },
  { id: "design-viewer", name: "Design Viewer", filename: "design-viewer.png" },
  { id: "qa-interface", name: "Q&A Interface", filename: "qa-interface.png" },
  {
    id: "execution-monitor-v2",
    name: "Execution Monitor V2",
    filename: "execution-monitor-v2.png",
  },
  { id: "settings-page", name: "Settings Page", filename: "settings-page.png" },
  { id: "pm-team-dashboard", name: "PM Team Dashboard", filename: "pm-team-dashboard.png" },
  { id: "enhanced-qa-card", name: "Enhanced Q&A Card", filename: "enhanced-qa-card.png" },
  {
    id: "enhanced-approval-card",
    name: "Enhanced Approval Card",
    filename: "enhanced-approval-card.png",
  },
  { id: "qa-question-card", name: "Question Card", filename: "qa-question-card.png" },
];

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

export default function DesignViewerPage() {
  const [selectedDesign, setSelectedDesign] = useState(availableDesigns[0]);
  const [showGrid, setShowGrid] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHeightVh, setPreviewHeightVh] = useState(60);
  const [isResizingPreview, setIsResizingPreview] = useState(false);
  const imageRef = useRef<HTMLDivElement>(null);
  const resizeStartYRef = useRef(0);
  const resizeStartHeightRef = useRef(60);
  const [phaseData, setPhaseData] = useState<DesignPhaseData | null>(null);
  const [phaseError, setPhaseError] = useState<string | null>(null);

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
    setSelectedDesign(availableDesigns[newIndex]);
  };

  return (
    <div className="min-h-screen bg-[#121826] text-white">
      <div className="flex min-h-screen flex-col">
        <div className="order-4 grid grid-cols-1 gap-4 p-4 lg:grid-cols-3">
          <Card className="border-[#334155] bg-[#1A1A1A] lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-white">设计阶段执行日志</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-44 pr-4">
                <div className="space-y-3">
                  {phaseError ? (
                    <p className="text-sm text-red-400">{phaseError}</p>
                  ) : !phaseData ? (
                    <p className="text-sm text-[#A0A0A0]">正在加载设计阶段日志...</p>
                  ) : phaseData.sessions.length === 0 ? (
                    <p className="text-sm text-[#A0A0A0]">暂无设计阶段会话日志</p>
                  ) : (
                    phaseData.sessions.map((session) => (
                      <div
                        key={`${session.name}-${session.timestamp}`}
                        className="rounded-md border border-[#334155] p-3"
                      >
                        <div className="mb-1 flex items-center justify-between">
                          <p className="text-sm font-medium text-white">{session.name}</p>
                          <Badge variant="outline" className="border-[#334155] text-[#A1A1AA]">
                            {session.role}
                          </Badge>
                        </div>
                        <p className="mb-2 text-xs text-[#71717A]">
                          {formatTime(session.timestamp)}
                        </p>
                        <ul className="space-y-1 text-xs text-[#A0A0A0]">
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

          <Card className="border-[#334155] bg-[#1A1A1A]">
            <CardHeader>
              <CardTitle className="text-white">AI Coding / IDE 日志</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-44 pr-4">
                <div className="space-y-3">
                  {phaseError ? (
                    <p className="text-sm text-red-400">{phaseError}</p>
                  ) : !phaseData ? (
                    <p className="text-sm text-[#A0A0A0]">正在加载工具日志...</p>
                  ) : phaseData.taskLogs.length === 0 ? (
                    <p className="text-sm text-[#A0A0A0]">暂无工具日志</p>
                  ) : (
                    phaseData.taskLogs.map((log, index) => (
                      <div
                        key={`${log.featureId}-${log.timestamp}-${index}`}
                        className="rounded-md border border-[#334155] p-3"
                      >
                        <p className="text-xs font-medium text-white">{log.featureId}</p>
                        <p className="text-xs text-[#71717A]">{formatTime(log.timestamp)}</p>
                        <p className="mt-1 text-xs text-[#A0A0A0]">{log.action}</p>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        <div className="order-5 grid grid-cols-1 gap-4 px-4 pb-4 lg:grid-cols-3">
          <Card className="border-[#334155] bg-[#1A1A1A]">
            <CardHeader>
              <CardTitle className="text-white">设计文档</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {!phaseData ? (
                <p className="text-sm text-[#A0A0A0]">正在加载...</p>
              ) : phaseData.artifacts.designDocs.length === 0 ? (
                <p className="text-sm text-[#A0A0A0]">暂无设计文档</p>
              ) : (
                phaseData.artifacts.designDocs
                  .slice(0, 5)
                  .map((artifact) => (
                    <MarkdownArtifactCard
                      key={artifact.relativePath}
                      artifact={artifact}
                      className="w-full rounded-md border border-[#334155] p-2 text-left"
                    />
                  ))
              )}
            </CardContent>
          </Card>

          <Card className="border-[#334155] bg-[#1A1A1A]">
            <CardHeader>
              <CardTitle className="text-white">设计系统产出</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {!phaseData ? (
                <p className="text-sm text-[#A0A0A0]">正在加载...</p>
              ) : phaseData.artifacts.stitchDocs.length === 0 ? (
                <p className="text-sm text-[#A0A0A0]">暂无设计系统文档</p>
              ) : (
                phaseData.artifacts.stitchDocs.map((artifact) => (
                  <MarkdownArtifactCard
                    key={artifact.relativePath}
                    artifact={artifact}
                    className="w-full rounded-md border border-[#334155] p-2 text-left"
                  />
                ))
              )}
            </CardContent>
          </Card>

          <Card className="border-[#334155] bg-[#1A1A1A]">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white">交互稿产出</CardTitle>
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
                <p className="text-sm text-[#A0A0A0]">正在加载...</p>
              ) : phaseData.artifacts.prototypes.length === 0 ? (
                <p className="text-sm text-[#A0A0A0]">暂无交互稿</p>
              ) : (
                phaseData.artifacts.prototypes
                  .slice(0, 8)
                  .map((artifact) => (
                    <MarkdownArtifactCard
                      key={artifact.relativePath}
                      artifact={artifact}
                      className="w-full rounded-md border border-[#334155] p-2 text-left"
                    />
                  ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Header */}
        <div className="order-1 flex items-center justify-between border-b border-[#334155] px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-[#A0A0A0]">
              <span
                className="cursor-pointer hover:text-white"
                onClick={() => (window.location.href = "/")}
              >
                Designs
              </span>
              <ChevronRight className="h-4 w-4" />
              <span className="text-white">{selectedDesign?.name}</span>
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
              className="rounded-md border border-[#334155] bg-[#1A1A1A] px-3 py-1.5 text-sm text-white"
            >
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
              className={cn(showGrid && "bg-[#3B82F6]/20 text-[#3B82F6]")}
            >
              <GridIcon className="h-4 w-4" />
            </Button>

            <div className="mx-2 h-6 w-px bg-[#334155]" />

            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
            <Button className="bg-gradient-to-r from-[#8B5CF6] to-[#3B82F6]" size="sm">
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
              disabled={availableDesigns.findIndex((d) => d.id === selectedDesign?.id) === 0}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </div>

          {/* Image Viewer */}
          <div className="relative flex-1 overflow-hidden bg-[#0A0A0A]">
            <div className="flex h-full w-full items-center justify-center p-6">
              <div ref={imageRef} className="relative h-full w-full max-w-[1800px]">
                <div className="relative h-full w-full min-h-[432px]">
                  <Image
                    src={getDesignAssetUrl(selectedDesign?.filename)}
                    alt={selectedDesign?.name || "Design"}
                    fill
                    sizes="(max-width: 1280px) 100vw, 80vw"
                    className={cn(
                      "cursor-zoom-in rounded-lg object-contain shadow-2xl",
                      showGrid && "bg-[url('/grid.png')]"
                    )}
                    onClick={() => setPreviewOpen(true)}
                    priority
                  />
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
                availableDesigns.findIndex((d) => d.id === selectedDesign?.id) ===
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
            <div className="h-1 w-24 rounded-full bg-[#334155] transition-all group-hover:w-32 group-hover:bg-[#3B82F6]" />
          </div>
        </div>

        {previewOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
            onClick={() => setPreviewOpen(false)}
          >
            <button
              type="button"
              className="absolute right-6 top-6 rounded-md border border-[#334155] bg-[#1A1A1A]/80 p-2 text-white hover:bg-[#1A1A1A]"
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

"use client";

import * as React from "react";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  File,
  Folder,
  CheckCircle,
  Clock,
  AlertCircle,
  PlusCircle,
  ClipboardList,
  Palette,
  Code2,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  type: "project" | "document" | "task" | "phase" | "action";
  icon: React.ReactNode;
  href?: string;
  action?: () => void;
}

interface QuickAction {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  action: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

type FeatureRecord = {
  id: string;
  title: string;
  status: { status: "pending" | "in_progress" | "completed" | "blocked" };
};

const phaseItems: SearchResult[] = [
  {
    id: "ph1",
    title: "Phase 1-2",
    subtitle: "Requirements & Product",
    type: "phase",
    icon: <ClipboardList className="w-4 h-4" />,
    href: "/requirements",
  },
  {
    id: "ph2",
    title: "Phase 2.5",
    subtitle: "UI/UX Design",
    type: "phase",
    icon: <Palette className="w-4 h-4" />,
    href: "/design",
  },
  {
    id: "ph3",
    title: "Phase 3-4",
    subtitle: "Architecture & Planning",
    type: "phase",
    icon: <Code2 className="w-4 h-4" />,
    href: "/architecture",
  },
  {
    id: "ph4",
    title: "Phase 5",
    subtitle: "Development",
    type: "phase",
    icon: <Code2 className="w-4 h-4" />,
    href: "/development",
  },
  {
    id: "ph5",
    title: "Phase 8",
    subtitle: "Project Management",
    type: "phase",
    icon: <Settings className="w-4 h-4" />,
    href: "/pm",
  },
];

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [projectName, setProjectName] = useState("Current Project");
  const [features, setFeatures] = useState<FeatureRecord[]>([]);
  const inputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch("/api/tasks", { cache: "no-store" });
        const payload = await response.json();
        if (!response.ok || !payload?.success) return;
        setProjectName(payload.data?.project || "Current Project");
        setFeatures((payload.data?.features || []) as FeatureRecord[]);
      } catch {}
    };
    load();
  }, []);

  useEffect(() => {
    const stored = window.localStorage.getItem("cmdk-recent-ids");
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as string[];
        setRecentIds(parsed.slice(0, 8));
      } catch {}
    }
  }, []);

  const statusIcon = useCallback((status: FeatureRecord["status"]["status"]) => {
    if (status === "completed") return <CheckCircle className="w-4 h-4" />;
    if (status === "in_progress") return <Clock className="w-4 h-4" />;
    if (status === "blocked") return <AlertCircle className="w-4 h-4" />;
    return <Clock className="w-4 h-4" />;
  }, []);

  const projectItems = useMemo<SearchResult[]>(
    () => [
      {
        id: "project-current",
        title: projectName,
        subtitle: "Open dashboard",
        type: "project",
        icon: <Folder className="w-4 h-4" />,
        href: "/",
      },
    ],
    [projectName]
  );

  const documentItems = useMemo<SearchResult[]>(
    () => [
      {
        id: "doc-brd",
        title: `BRD - ${projectName}`,
        subtitle: "Business Requirements",
        type: "document",
        icon: <File className="w-4 h-4" />,
        href: "/requirements",
      },
      {
        id: "doc-prd",
        title: `PRD - ${projectName}`,
        subtitle: "Product Requirements",
        type: "document",
        icon: <File className="w-4 h-4" />,
        href: "/requirements",
      },
      {
        id: "doc-arch",
        title: `ARCH - ${projectName}`,
        subtitle: "Architecture Document",
        type: "document",
        icon: <File className="w-4 h-4" />,
        href: "/architecture",
      },
      {
        id: "doc-design",
        title: "DESIGN.md",
        subtitle: "Design System",
        type: "document",
        icon: <File className="w-4 h-4" />,
        href: "/design",
      },
    ],
    [projectName]
  );

  const taskItems = useMemo<SearchResult[]>(
    () =>
      features.map((feature) => ({
        id: feature.id,
        title: `${feature.id}: ${feature.title}`,
        subtitle: feature.status.status.replace("_", " "),
        type: "task",
        icon: statusIcon(feature.status.status),
        href: "/pm",
      })),
    [features, statusIcon]
  );

  const allResults = useMemo<SearchResult[]>(
    () => [...projectItems, ...documentItems, ...taskItems, ...phaseItems],
    [projectItems, documentItems, taskItems]
  );

  const recentItems = useMemo(
    () =>
      recentIds
        .map((id) => allResults.find((item) => item.id === id))
        .filter(Boolean) as SearchResult[],
    [recentIds, allResults]
  );

  const quickActions: QuickAction[] = useMemo(
    () => [
      {
        id: "action-jump-project",
        title: "Jump to Project Dashboard",
        subtitle: "Open project overview",
        icon: <Folder className="w-4 h-4" />,
        action: () => {
          router.push("/");
          onClose();
        },
      },
      {
        id: "action-create-project",
        title: "Create New Project",
        subtitle: "Open start flow",
        icon: <PlusCircle className="w-4 h-4" />,
        action: () => {
          router.push("/?create=1");
          onClose();
        },
      },
      {
        id: "action-theme",
        title: "Switch Theme",
        subtitle: "Toggle dark/light mode",
        icon: <Palette className="w-4 h-4" />,
        action: () => {
          const html = document.documentElement;
          html.classList.toggle("dark");
          onClose();
        },
      },
      {
        id: "action-settings",
        title: "Open Settings",
        subtitle: "Configure application settings",
        icon: <Settings className="w-4 h-4" />,
        action: () => {
          router.push("/settings");
          onClose();
        },
      },
    ],
    [onClose, router]
  );

  const getFilteredResults = useCallback((): SearchResult[] => {
    if (!searchQuery) return [];
    const query = searchQuery.toLowerCase();
    return allResults.filter(
      (item) =>
        item.title.toLowerCase().includes(query) || item.subtitle?.toLowerCase().includes(query)
    );
  }, [searchQuery, allResults]);

  const groupedResults = useCallback(() => {
    const filtered = getFilteredResults();
    const groups = {
      projects: filtered.filter((r) => r.type === "project"),
      documents: filtered.filter((r) => r.type === "document"),
      tasks: filtered.filter((r) => r.type === "task"),
      phases: filtered.filter((r) => r.type === "phase"),
    };

    return groups as {
      projects: SearchResult[];
      documents: SearchResult[];
      tasks: SearchResult[];
      phases: SearchResult[];
    };
  }, [getFilteredResults]);

  const handleSelect = useCallback(
    (index: number) => {
      if (searchQuery) {
        const filtered = getFilteredResults();
        const item = filtered[index];
        if (item) {
          if (item.href) {
            router.push(item.href);
          } else {
            item.action?.();
          }
          setRecentIds((prev) => {
            const next = [item.id, ...prev.filter((id) => id !== item.id)].slice(0, 8);
            window.localStorage.setItem("cmdk-recent-ids", JSON.stringify(next));
            return next;
          });
          onClose();
        }
      } else {
        const allItems: (QuickAction | SearchResult)[] = [...quickActions, ...recentItems];
        const item = allItems[index];
        if (item && "action" in item && typeof item.action === "function") {
          item.action();
        } else if (item && "href" in item && item.href) {
          router.push(item.href);
          onClose();
        }
      }
    },
    [searchQuery, getFilteredResults, quickActions, recentItems, onClose, router]
  );

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const filtered = getFilteredResults();
      const totalItems = searchQuery ? filtered.length : quickActions.length + recentItems.length;
      if (totalItems === 0) {
        if (e.key === "Escape") {
          onClose();
        }
        return;
      }

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % totalItems);
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => (prev - 1 + totalItems) % totalItems);
          break;
        case "Enter":
          e.preventDefault();
          handleSelect(selectedIndex);
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    isOpen,
    selectedIndex,
    searchQuery,
    getFilteredResults,
    quickActions.length,
    recentItems.length,
    onClose,
    handleSelect,
  ]);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setSearchQuery("");
      setSelectedIndex(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filtered = getFilteredResults();
  const groups = groupedResults();

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={onClose} />

      {/* Modal */}
      <div className="fixed left-1/2 top-20 z-50 w-full max-w-2xl -translate-x-1/2">
        <div className="bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
          {/* Search Input */}
          <div className="flex items-center border-b border-border px-4">
            <Search className="w-5 h-5 text-muted-foreground mr-3" />
            <Input
              ref={inputRef}
              type="text"
              placeholder="Search projects, documents, tasks, phases..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSelectedIndex(0);
              }}
              className="border-0 focus-visible:ring-0 text-base"
            />
            <kbd className="hidden sm:inline-flex h-6 items-center gap-1 rounded border border-border bg-secondary px-2 font-mono text-xs text-muted-foreground">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <ScrollArea className="max-h-96">
            {searchQuery ? (
              /* Search Results */
              <div className="py-2">
                {filtered.length === 0 ? (
                  <div className="px-4 py-8 text-center text-muted-foreground">
                    No results found for &quot;{searchQuery}&quot;
                  </div>
                ) : (
                  <>
                    {groups.projects.length > 0 && (
                      <ResultSection
                        title="Projects"
                        items={groups.projects}
                        selectedIndex={selectedIndex}
                        onSelect={handleSelect}
                        startIndex={0}
                      />
                    )}
                    {groups.documents.length > 0 && (
                      <ResultSection
                        title="Documents"
                        items={groups.documents}
                        selectedIndex={selectedIndex}
                        onSelect={handleSelect}
                        startIndex={groups.projects.length}
                      />
                    )}
                    {groups.tasks.length > 0 && (
                      <ResultSection
                        title="Tasks"
                        items={groups.tasks}
                        selectedIndex={selectedIndex}
                        onSelect={handleSelect}
                        startIndex={groups.projects.length + groups.documents.length}
                      />
                    )}
                    {groups.phases.length > 0 && (
                      <ResultSection
                        title="Phases"
                        items={groups.phases}
                        selectedIndex={selectedIndex}
                        onSelect={handleSelect}
                        startIndex={
                          groups.projects.length + groups.documents.length + groups.tasks.length
                        }
                      />
                    )}
                  </>
                )}
              </div>
            ) : (
              /* Default View */
              <div className="py-2">
                {/* Quick Actions */}
                <div className="px-3 py-2">
                  <div className="mb-2 px-3 text-xs font-semibold text-muted-foreground uppercase">
                    Quick Actions
                  </div>
                  {quickActions.map((action, idx) => (
                    <button
                      key={action.id}
                      onClick={() => action.action()}
                      className={cn(
                        "w-full flex items-center px-3 py-2 rounded-md text-sm transition-colors",
                        selectedIndex === idx
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-accent"
                      )}
                    >
                      <span className="mr-3 text-muted-foreground">{action.icon}</span>
                      <div className="flex-1 text-left">
                        <div className="font-medium">{action.title}</div>
                        <div className="text-xs text-muted-foreground">{action.subtitle}</div>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Recent Items */}
                {recentItems.length > 0 && (
                  <div className="px-3 py-2 border-t border-border">
                    <div className="mb-2 px-3 text-xs font-semibold text-muted-foreground uppercase">
                      Recent
                    </div>
                    {recentItems.map((item, idx) => (
                      <button
                        key={item.id}
                        onClick={() => handleSelect(quickActions.length + idx)}
                        className={cn(
                          "w-full flex items-center px-3 py-2 rounded-md text-sm transition-colors",
                          selectedIndex === quickActions.length + idx
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-accent"
                        )}
                      >
                        <span className="mr-3 text-muted-foreground">{item.icon}</span>
                        <div className="flex-1 text-left">
                          <div className="font-medium">{item.title}</div>
                          {item.subtitle && (
                            <div className="text-xs text-muted-foreground">{item.subtitle}</div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Empty State */}
                {recentItems.length === 0 && (
                  <div className="px-4 py-8 text-center text-muted-foreground text-sm">
                    Start typing to search across projects, documents, tasks, and phases
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          {/* Footer */}
          <div className="border-t border-border px-4 py-2 flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <kbd className="inline-flex h-5 items-center rounded border border-border bg-secondary px-1.5 font-mono text-xs">
                  ↑
                </kbd>
                <kbd className="inline-flex h-5 items-center rounded border border-border bg-secondary px-1.5 font-mono text-xs">
                  ↓
                </kbd>
                <span className="ml-1">to navigate</span>
              </div>
              <div className="flex items-center gap-1">
                <kbd className="inline-flex h-5 items-center rounded border border-border bg-secondary px-1.5 font-mono text-xs">
                  ↵
                </kbd>
                <span className="ml-1">to select</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="inline-flex h-5 items-center rounded border border-border bg-secondary px-1.5 font-mono text-xs">
                ESC
              </kbd>
              <span className="ml-1">to close</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// Result Section Component
interface ResultSectionProps {
  title: string;
  items: SearchResult[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  startIndex: number;
}

function ResultSection({ title, items, selectedIndex, onSelect, startIndex }: ResultSectionProps) {
  return (
    <div className="px-3 py-2">
      <div className="mb-2 px-3 text-xs font-semibold text-muted-foreground uppercase">{title}</div>
      {items.map((item, idx) => {
        const globalIndex = startIndex + idx;
        const isSelected = selectedIndex === globalIndex;

        return (
          <button
            key={item.id}
            onClick={() => onSelect(globalIndex)}
            className={cn(
              "w-full flex items-center px-3 py-2 rounded-md text-sm transition-colors",
              isSelected ? "bg-primary text-primary-foreground" : "hover:bg-accent"
            )}
          >
            <span className="mr-3 text-muted-foreground">{item.icon}</span>
            <div className="flex-1 text-left">
              <div className="font-medium">{item.title}</div>
              {item.subtitle && (
                <div
                  className={cn(
                    "text-xs",
                    isSelected ? "text-primary-foreground/80" : "text-muted-foreground"
                  )}
                >
                  {item.subtitle}
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

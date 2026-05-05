"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { useTour } from "./tour-provider";

const PADDING = 10;
const ARROW_SIZE = 8;

export function TourOverlay() {
  const { isTourActive, currentStep, currentStepIndex, totalSteps, nextStep, prevStep, skipTour } =
    useTour();
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [tooltipPos, setTooltipPos] = useState<CSSProperties>({});
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isTourActive || !currentStep) {
      setRect(null);
      return;
    }

    const measure = () => {
      const el = document.querySelector(currentStep.target);
      if (!el) return;
      const r = el.getBoundingClientRect();
      setRect(r);

      const placement = currentStep.placement ?? "bottom";
      const style: CSSProperties = { position: "fixed" };

      switch (placement) {
        case "top":
          style.left = r.left + r.width / 2;
          style.top = r.top - PADDING - ARROW_SIZE;
          style.transform = "translate(-50%, -100%)";
          break;
        case "bottom":
          style.left = r.left + r.width / 2;
          style.top = r.bottom + PADDING + ARROW_SIZE;
          style.transform = "translate(-50%, 0)";
          break;
        case "left":
          style.left = r.left - PADDING - ARROW_SIZE;
          style.top = r.top + r.height / 2;
          style.transform = "translate(-100%, -50%)";
          break;
        case "right":
          style.left = r.right + PADDING + ARROW_SIZE;
          style.top = r.top + r.height / 2;
          style.transform = "translate(0, -50%)";
          break;
      }
      setTooltipPos(style);
    };

    measure();
    const id = setInterval(measure, 200);
    return () => clearInterval(id);
  }, [isTourActive, currentStep]);

  if (!isTourActive || !currentStep || !rect) return null;

  const placement = currentStep.placement ?? "bottom";
  const isFirst = currentStepIndex === 0;
  const isLast = currentStepIndex === totalSteps - 1;

  return (
    <div ref={overlayRef} className="fixed inset-0 z-[9999]" role="dialog" aria-label="Tour guide">
      {/* Spotlight overlay using SVG cutout */}
      <svg className="absolute inset-0 h-full w-full">
        <defs>
          <mask id="tour-spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            <rect
              x={rect.left - PADDING}
              y={rect.top - PADDING}
              width={rect.width + PADDING * 2}
              height={rect.height + PADDING * 2}
              rx="12"
              fill="black"
            />
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.5)"
          mask="url(#tour-spotlight-mask)"
        />
        {/* Highlight border */}
        <rect
          x={rect.left - PADDING}
          y={rect.top - PADDING}
          width={rect.width + PADDING * 2}
          height={rect.height + PADDING * 2}
          rx="12"
          fill="none"
          stroke="hsl(20,90%,54%)"
          strokeWidth="2"
        />
      </svg>

      {/* Tooltip */}
      <div
        style={{
          ...tooltipPos,
          maxWidth: "min(360px, 90vw)",
          minWidth: "240px",
        }}
        className="rounded-2xl border border-[hsl(28,22%,84%)] bg-card p-4 shadow-2xl"
      >
        {/* Arrow */}
        <div
          className="absolute h-2 w-2 rotate-45 border-border bg-card"
          style={{
            ...(placement === "bottom" && {
              bottom: "100%",
              left: "50%",
              marginLeft: -ARROW_SIZE / 2,
              borderBottom: "none",
              borderRight: "none",
            }),
            ...(placement === "top" && {
              top: "100%",
              left: "50%",
              marginLeft: -ARROW_SIZE / 2,
              borderTop: "none",
              borderLeft: "none",
            }),
            ...(placement === "left" && {
              left: "100%",
              top: "50%",
              marginTop: -ARROW_SIZE / 2,
              borderLeft: "none",
              borderBottom: "none",
            }),
            ...(placement === "right" && {
              right: "100%",
              top: "50%",
              marginTop: -ARROW_SIZE / 2,
              borderRight: "none",
              borderTop: "none",
            }),
          }}
        />

        <div className="flex items-start justify-between gap-2 mb-1.5">
          <h3 className="text-sm font-semibold text-foreground">{currentStep.title}</h3>
          <button
            onClick={skipTour}
            className="shrink-0 rounded-md p-0.5 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Skip tour"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground mb-3">{currentStep.content}</p>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">
            {currentStepIndex + 1} / {totalSteps}
          </span>
          <div className="flex items-center gap-1.5">
            {!isFirst && (
              <button
                onClick={prevStep}
                className="inline-flex items-center gap-1 rounded-lg border border-border/60 px-2.5 py-1 text-xs font-medium text-foreground hover:bg-secondary/50 transition-colors"
              >
                <ChevronLeft className="h-3 w-3" />
                Prev
              </button>
            )}
            <button
              onClick={nextStep}
              className="inline-flex items-center gap-1 rounded-lg bg-[hsl(20,90%,54%)] px-3 py-1 text-xs font-semibold text-white hover:opacity-90 transition-opacity"
            >
              {isLast ? "Done" : "Next"}
              {!isLast && <ChevronRight className="h-3 w-3" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

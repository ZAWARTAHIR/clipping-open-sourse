"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "supoclip.editor.timelineHeight";
export const TIMELINE_MIN = 132;
/** Room the header and a usable viewer keep when the timeline grows. */
const RESERVED = 56 + 280;
const STEP = 24;

function readStored(): number | null {
  try {
    const value = Number(window.localStorage.getItem(STORAGE_KEY));
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

function store(height: number | null) {
  try {
    if (height === null) window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, String(Math.round(height)));
  } catch {
    // Private windows and blocked storage: the size just isn't remembered.
  }
}

function maxHeight() {
  return Math.max(TIMELINE_MIN, window.innerHeight - RESERVED);
}

/**
 * Height the user dragged the timeline to (desktop layout), remembered per browser.
 * `null` keeps the default height.
 */
export function useTimelineHeight() {
  const [height, setHeight] = useState<number | null>(null);
  useEffect(() => {
    setHeight(readStored());
    const fit = () =>
      setHeight((h) => (h === null ? h : Math.min(Math.max(h, TIMELINE_MIN), maxHeight())));
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);
  const resize = useCallback((next: number | null, persist = true) => {
    const value = next === null ? null : Math.min(Math.max(next, TIMELINE_MIN), maxHeight());
    setHeight(value);
    if (persist) store(value);
  }, []);
  return [height, resize] as const;
}

/** Horizontal splitter between the viewer and the timeline. Double-click resets. */
export function TimelineResizeHandle({
  height,
  defaultHeight,
  onResize,
  target,
}: {
  height: number | null;
  defaultHeight: number;
  onResize: (height: number | null, persist?: boolean) => void;
  /** The timeline wrapper; its rendered height is where a drag starts. */
  target: React.RefObject<HTMLElement | null>;
}) {
  const t = useTranslations("editor");
  const drag = useRef<{ y: number; start: number; last: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const current = height ?? defaultHeight;
  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      aria-label={t("timeline.resize")}
      aria-valuemin={TIMELINE_MIN}
      aria-valuenow={Math.round(current)}
      tabIndex={0}
      title={t("timeline.resizeTip")}
      className="group hidden h-3 shrink-0 cursor-row-resize touch-none items-center justify-center outline-none lg:flex"
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        const start = target.current?.getBoundingClientRect().height ?? current;
        drag.current = { y: event.clientY, start, last: start };
        setDragging(true);
      }}
      onPointerMove={(event) => {
        const state = drag.current;
        if (!state) return;
        state.last = state.start - (event.clientY - state.y);
        onResize(state.last, false);
      }}
      onPointerUp={(event) => {
        const state = drag.current;
        drag.current = null;
        setDragging(false);
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
        if (state) onResize(state.last);
      }}
      onPointerCancel={() => {
        drag.current = null;
        setDragging(false);
      }}
      onDoubleClick={() => onResize(null)}
      onKeyDown={(event) => {
        if (event.key === "ArrowUp" || event.key === "ArrowDown") {
          event.preventDefault();
          event.stopPropagation();
          onResize(current + (event.key === "ArrowUp" ? STEP : -STEP));
        } else if (event.key === "Home" || event.key === "Enter") {
          event.preventDefault();
          event.stopPropagation();
          onResize(null);
        }
      }}
    >
      <span
        aria-hidden
        className={cn(
          "h-1 w-12 rounded-full bg-stone-300 transition-colors group-hover:bg-stone-400 group-focus-visible:bg-ring dark:bg-stone-700 dark:group-hover:bg-stone-500",
          dragging && "bg-stone-500 dark:bg-stone-400",
        )}
      />
    </div>
  );
}

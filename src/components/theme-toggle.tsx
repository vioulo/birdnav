"use client";

import { useEffect, useRef, useState } from "react";
import { MoonStar, Sun } from "lucide-react";

import type { ThemeMode } from "@/lib/options";

type ThemeToggleProps = {
  initialTheme?: ThemeMode;
  redirectTo?: string;
};

type CanvasCell = {
  x: number;
  y: number;
  width: number;
  height: number;
  delay: number;
  releaseDelay: number;
  color: string;
  lineColor: string;
};

type CanvasFrame = {
  cells: CanvasCell[];
  maxCoverDelay: number;
  maxRevealDelay: number;
};

type ThemePalette = {
  fill: string;
  line: string;
};

function applyTheme(nextTheme: ThemeMode) {
  document.documentElement.dataset.theme = nextTheme;
}

function nextFrame() {
  return new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => {
      resolve();
    });
  });
}

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function easeOutCubic(value: number) {
  return 1 - Math.pow(1 - value, 3);
}

function easeInCubic(value: number) {
  return value * value * value;
}

function getThemePalette(nextTheme: ThemeMode): ThemePalette {
  if (nextTheme === "light") {
    return {
      fill: "#f7f7f7",
      line: "rgba(17, 17, 17, 0.1)",
    };
  }

  return {
    fill: "#0f172a",
    line: "rgba(148, 163, 184, 0.16)",
  };
}

function prepareCanvas(canvas: HTMLCanvasElement) {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const context = canvas.getContext("2d", { alpha: true });

  if (!context) {
    return null;
  }

  canvas.width = Math.ceil(width * dpr);
  canvas.height = Math.ceil(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.imageSmoothingEnabled = false;

  return { context, width, height };
}

function buildCanvasFrame(
  nextTheme: ThemeMode,
  origin: { x: number; y: number },
): CanvasFrame {
  const palette = getThemePalette(nextTheme);
  const tileSize = window.innerWidth < 720 ? 18 : 22;
  const cols = Math.max(12, Math.ceil(window.innerWidth / tileSize));
  const rows = Math.max(12, Math.ceil(window.innerHeight / tileSize));
  const tileWidth = window.innerWidth / cols;
  const tileHeight = window.innerHeight / rows;
  const cells: CanvasCell[] = [];
  let maxCoverDelay = 0;
  let maxRevealDelay = 0;
  const maxDistance = Math.max(
    Math.hypot(origin.x, origin.y),
    Math.hypot(window.innerWidth - origin.x, origin.y),
    Math.hypot(origin.x, window.innerHeight - origin.y),
    Math.hypot(window.innerWidth - origin.x, window.innerHeight - origin.y),
  );

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const centerX = col * tileWidth + tileWidth / 2;
      const centerY = row * tileHeight + tileHeight / 2;
      const distance = Math.hypot(centerX - origin.x, centerY - origin.y);
      const ratio = distance / maxDistance;
      const noise = ((row * 29 + col * 17) % 13) / 12;
      const delay = Math.round(ratio * 180 + noise * 28);
      const releaseDelay = Math.round(ratio * 150 + (1 - noise) * 22);

      if (delay > maxCoverDelay) {
        maxCoverDelay = delay;
      }

      if (releaseDelay > maxRevealDelay) {
        maxRevealDelay = releaseDelay;
      }

      cells.push({
        x: col * tileWidth,
        y: row * tileHeight,
        width: tileWidth,
        height: tileHeight,
        delay,
        releaseDelay,
        color: palette.fill,
        lineColor: palette.line,
      });
    }
  }

  return {
    cells,
    maxCoverDelay,
    maxRevealDelay,
  };
}

function drawCell(
  context: CanvasRenderingContext2D,
  cell: CanvasCell,
  progress: number,
  phase: "cover" | "reveal",
) {
  const eased = phase === "cover" ? easeOutCubic(progress) : easeInCubic(progress);
  const opacity = phase === "cover" ? eased : 1 - eased;

  if (opacity <= 0) {
    return;
  }

  const maxInset = Math.min(cell.width, cell.height) * 0.42;
  const inset = phase === "cover" ? maxInset * (1 - eased) : maxInset * eased;
  const x = Math.round(cell.x + inset);
  const y = Math.round(cell.y + inset);
  const width = Math.ceil(cell.width - inset * 2) + 1;
  const height = Math.ceil(cell.height - inset * 2) + 1;

  context.globalAlpha = opacity;
  context.fillStyle = cell.color;
  context.fillRect(x, y, width, height);

  context.globalAlpha = opacity * 0.45;
  context.strokeStyle = cell.lineColor;
  context.strokeRect(x + 0.5, y + 0.5, Math.max(0, width - 1), Math.max(0, height - 1));
}

function renderCanvasPhase(
  prepared: NonNullable<ReturnType<typeof prepareCanvas>>,
  frame: CanvasFrame,
  phase: "cover" | "reveal",
  shouldContinue: () => boolean,
) {
  const { context, width, height } = prepared;
  const duration = phase === "cover" ? 220 : 210;
  const maxDelay = phase === "cover" ? frame.maxCoverDelay : frame.maxRevealDelay;

  return new Promise<void>((resolve) => {
    let startTime = 0;

    const tick = (timestamp: number) => {
      if (!shouldContinue()) {
        resolve();
        return;
      }

      if (!startTime) {
        startTime = timestamp;
      }

      const elapsed = timestamp - startTime;

      context.clearRect(0, 0, width, height);

      for (const cell of frame.cells) {
        const delay = phase === "cover" ? cell.delay : cell.releaseDelay;
        const progress = clamp((elapsed - delay) / duration);
        drawCell(context, cell, progress, phase);
      }

      context.globalAlpha = 1;

      if (elapsed < maxDelay + duration) {
        window.requestAnimationFrame(tick);
        return;
      }

      resolve();
    };

    window.requestAnimationFrame(tick);
  });
}

export function ThemeToggle({ initialTheme = "dark", redirectTo = "/" }: ThemeToggleProps) {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const transitionIdRef = useRef(0);
  const [theme, setTheme] = useState<ThemeMode>(initialTheme);
  const [busy, setBusy] = useState(false);
  const [canvasTheme, setCanvasTheme] = useState<ThemeMode | null>(null);

  useEffect(() => {
    return () => {
      transitionIdRef.current += 1;
      delete document.documentElement.dataset.themeCanvas;
    };
  }, []);

  async function handleToggle() {
    if (busy) {
      return;
    }

    const nextTheme: ThemeMode = theme === "dark" ? "light" : "dark";
    const rect = buttonRef.current?.getBoundingClientRect();
    const origin = rect
      ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
      : { x: window.innerWidth - 28, y: 28 };
    const transitionId = transitionIdRef.current + 1;
    transitionIdRef.current = transitionId;

    setBusy(true);

    const formData = new FormData();
    formData.set("theme", nextTheme);
    formData.set(
      "redirectTo",
      redirectTo === "/" ? `${window.location.pathname}${window.location.search}` : redirectTo,
    );
    const persistThemePromise = fetch("/theme", {
      method: "POST",
      headers: {
        "x-theme-update": "1",
      },
      body: formData,
    }).catch(() => undefined);

    const shouldContinue = () => transitionIdRef.current === transitionId;

    try {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        applyTheme(nextTheme);
        setTheme(nextTheme);
        return;
      }

      const root = document.documentElement;
      const frame = buildCanvasFrame(nextTheme, origin);

      root.dataset.themeCanvas = "running";
      setCanvasTheme(nextTheme);
      await nextFrame();

      const canvas = canvasRef.current;

      if (!canvas || !shouldContinue()) {
        applyTheme(nextTheme);
        setTheme(nextTheme);
        return;
      }

      const prepared = prepareCanvas(canvas);

      if (!prepared) {
        applyTheme(nextTheme);
        setTheme(nextTheme);
        return;
      }

      await renderCanvasPhase(prepared, frame, "cover", shouldContinue);

      if (!shouldContinue()) {
        return;
      }

      applyTheme(nextTheme);
      setTheme(nextTheme);
      await nextFrame();
      await nextFrame();

      if (!shouldContinue()) {
        return;
      }

      await renderCanvasPhase(prepared, frame, "reveal", shouldContinue);
    } finally {
      void persistThemePromise;
      if (transitionIdRef.current === transitionId) {
        delete document.documentElement.dataset.themeCanvas;
        setCanvasTheme(null);
        setBusy(false);
      }
    }
  }

  return (
    <>
      <button
        ref={buttonRef}
        className="theme-toggle-button"
        type="button"
        onClick={handleToggle}
        aria-label={theme === "dark" ? "切换到浅色主题" : "切换到深色主题"}
        disabled={busy}
      >
        {theme === "dark" ? (
          <Sun className="theme-toggle-icon" strokeWidth={1.8} />
        ) : (
          <MoonStar className="theme-toggle-icon" strokeWidth={1.8} />
        )}
      </button>
      {canvasTheme ? (
        <canvas
          ref={canvasRef}
          className="theme-canvas-overlay"
          data-next-theme={canvasTheme}
          aria-hidden="true"
        />
      ) : null}
    </>
  );
}

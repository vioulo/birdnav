"use client";

import { useEffect } from "react";

export function BootVeil() {
  useEffect(() => {
    const markReady = () => {
      document.documentElement.classList.add("is-boot-ready");
    };

    const frameId = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(markReady);
    });
    const fallbackId = window.setTimeout(markReady, 900);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(fallbackId);
    };
  }, []);

  return null;
}

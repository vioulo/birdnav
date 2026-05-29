"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

type ModalEscCloseProps = {
  href: string;
};

export function ModalEscClose({ href }: ModalEscCloseProps) {
  const router = useRouter();

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }

      event.preventDefault();
      router.replace(href, { scroll: false });
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [href, router]);

  return null;
}

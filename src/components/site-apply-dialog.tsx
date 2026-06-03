"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Loader2, Send, X } from "lucide-react";

type SiteApplyDialogProps = {
  categories: Array<{
    id: number;
    name: string;
  }>;
};

type ApplyStatus = {
  type: "success" | "error";
  message: string;
};

function readResponseMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object" && "message" in payload) {
    const message = String((payload as { message?: unknown }).message || "").trim();

    if (message) {
      return message;
    }
  }

  return fallback;
}

export function SiteApplyDialog({ categories }: SiteApplyDialogProps) {
  const formRef = useRef<HTMLFormElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<ApplyStatus | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus(null);

    const formData = new FormData(event.currentTarget);
    const payload = {
      catId: formData.get("catId"),
      name: formData.get("name"),
      url: formData.get("url"),
      iconUrl: formData.get("iconUrl"),
      description: formData.get("description"),
    };

    try {
      const response = await fetch("/api/sites/apply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const responsePayload = await response.json().catch(() => null);
      const message = readResponseMessage(
        responsePayload,
        response.ok ? "申请已提交。" : "提交失败，请稍后再试。",
      );

      if (!response.ok) {
        setStatus({ type: "error", message });
        return;
      }

      formRef.current?.reset();
      setStatus({ type: "success", message });
    } catch {
      setStatus({ type: "error", message: "提交失败，请检查网络后重试。" });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <button
        className="header-action-link is-strong site-apply-trigger"
        type="button"
        onClick={() => {
          setStatus(null);
          setIsOpen(true);
        }}
      >
        申请收录
      </button>

      {isOpen ? (
        <div className="modal-overlay site-apply-overlay">
          <div className="modal-card site-apply-card">
            <div className="modal-header">
              <div>
                <p className="eyebrow">Submit</p>
                <h3 className="mt-1 text-xl font-semibold">申请收录</h3>
              </div>
              <button
                className="button-secondary site-apply-close"
                type="button"
                aria-label="关闭"
                onClick={() => setIsOpen(false)}
              >
                <X aria-hidden="true" />
              </button>
            </div>
            <form ref={formRef} className="modal-body admin-form-grid" onSubmit={handleSubmit}>
              <label className="block space-y-2">
                <span className="text-sm font-medium">所属分类</span>
                <select className="input" name="catId" required defaultValue="">
                  <option value="" disabled>
                    选择分类
                  </option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-medium">站点名称</span>
                <input className="input" name="name" placeholder="例如：GitHub" required />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-medium">链接</span>
                <input className="input" name="url" placeholder="https://github.com" required />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-medium">站点 Icon</span>
                <input className="input" name="iconUrl" placeholder="可选，留空自动尝试抓取" />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-medium">简介</span>
                <textarea
                  className="input min-h-24 resize-y"
                  name="description"
                  placeholder="一句话说明这个站点是做什么的"
                />
              </label>
              {status ? (
                <p className={`site-apply-status is-${status.type}`}>{status.message}</p>
              ) : null}
              <div className="flex justify-end gap-2">
                <button
                  className="button-secondary"
                  type="button"
                  onClick={() => setIsOpen(false)}
                  disabled={isSubmitting}
                >
                  取消
                </button>
                <button className="button-primary" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <Loader2 className="animate-spin" aria-hidden="true" />
                  ) : (
                    <Send aria-hidden="true" />
                  )}
                  {isSubmitting ? "提交中" : "提交申请"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

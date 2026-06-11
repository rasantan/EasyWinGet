"use client";

import { useEffect, useRef } from "react";

const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "error-callback"?: () => void;
          "expired-callback"?: () => void;
          size?: "normal" | "compact" | "invisible";
        },
      ) => string;
      remove: (widgetId: string) => void;
    };
  }
}

async function bootstrapSession(captchaToken?: string): Promise<void> {
  await fetch("/api/auth/bootstrap", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(captchaToken ? { captchaToken } : {}),
  });
}

function loadTurnstileScript(): Promise<void> {
  if (document.querySelector('script[data-turnstile="true"]')) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.dataset.turnstile = "true";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Turnstile"));
    document.head.appendChild(script);
  });
}

export function AnonymousAuthBootstrap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) {
      return;
    }
    startedRef.current = true;

    async function run() {
      if (!turnstileSiteKey) {
        await bootstrapSession();
        return;
      }

      try {
        await loadTurnstileScript();
      } catch {
        await bootstrapSession();
        return;
      }

      const container = containerRef.current;
      if (!container || !window.turnstile) {
        await bootstrapSession();
        return;
      }

      window.turnstile.render(container, {
        sitekey: turnstileSiteKey,
        size: "invisible",
        callback: (token) => {
          void bootstrapSession(token);
        },
        "error-callback": () => {
          void bootstrapSession();
        },
        "expired-callback": () => {
          startedRef.current = false;
        },
      });
    }

    void run();
  }, []);

  if (!turnstileSiteKey) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className="sr-only"
      aria-hidden="true"
      data-testid="turnstile-container"
    />
  );
}

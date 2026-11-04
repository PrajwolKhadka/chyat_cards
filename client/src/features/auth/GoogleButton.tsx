"use client";

import { useEffect, useRef, useState } from "react";

type GsiId = {
  initialize: (config: {
    client_id: string;
    callback: (response: { credential: string }) => void;
  }) => void;
  renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
};

declare global {
  interface Window {
    google?: { accounts: { id: GsiId } };
  }
}

let gsiPromise: Promise<void> | null = null;

function loadGsi(): Promise<void> {
  if (!gsiPromise) {
    gsiPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        gsiPromise = null;
        reject(new Error("Could not load Google"));
      };
      document.head.appendChild(script);
    });
  }
  return gsiPromise;
}

export default function GoogleButton({ onCredential }: { onCredential: (credential: string) => void }) {
  const holder = useRef<HTMLDivElement>(null);
  const latest = useRef(onCredential);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    latest.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) {
      setFailed(true);
      return;
    }

    let cancelled = false;
    loadGsi()
      .then(() => {
        const gsi = window.google?.accounts.id;
        const el = holder.current;
        if (cancelled || !gsi || !el) return;

        gsi.initialize({
          client_id: clientId,
          callback: (response) => latest.current(response.credential),
        });
        gsi.renderButton(el, {
          theme: "outline",
          size: "large",
          shape: "pill",
          text: "continue_with",
          width: Math.min(el.clientWidth, 400),
        });
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (failed) {
    return <p className="text-center text-sm text-ink/60">Google sign in is not available right now.</p>;
  }

  return <div ref={holder} className="flex min-h-11 w-full justify-center" />;
}

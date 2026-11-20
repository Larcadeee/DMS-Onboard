"use client";

import { useEffect, useRef, useState } from "react";

interface GoogleCredentialResponse {
  credential?: string;
}

interface GoogleIdentityServices {
  accounts: {
    id: {
      initialize: (options: {
        client_id: string;
        callback: (response: GoogleCredentialResponse) => void;
      }) => void;
      renderButton: (
        element: HTMLElement,
        options: Record<string, string | number | boolean>
      ) => void;
    };
  };
}

declare global {
  interface Window {
    google?: GoogleIdentityServices;
  }
}

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
const SCRIPT_ID = "google-gsi-client";

export function isGoogleSignInConfigured(): boolean {
  return Boolean(CLIENT_ID);
}

export function GoogleSignIn({
  onCredential,
  text = "continue_with",
  disabled = false,
}: {
  onCredential: (credential: string) => void;
  text?: "continue_with" | "signin_with" | "signup_with";
  disabled?: boolean;
}) {
  const container = useRef<HTMLDivElement>(null);
  const callbackRef = useRef(onCredential);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    callbackRef.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    if (!CLIENT_ID) return;

    let cancelled = false;

    function init() {
      if (cancelled || !window.google?.accounts?.id || !container.current) return;

      window.google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: (response) => {
          if (response.credential) {
            callbackRef.current(response.credential);
          }
        },
      });

      window.google.accounts.id.renderButton(container.current, {
        type: "standard",
        theme: "outline",
        size: "large",
        text,
        shape: "rectangular",
        logo_alignment: "left",
        width: 336,
      });

      setReady(true);
    }

    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;

    if (existing) {
      if (window.google?.accounts?.id) {
        init();
      } else {
        existing.addEventListener("load", init, { once: true });
      }
    } else {
      const script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.addEventListener("load", init, { once: true });
      document.head.appendChild(script);
    }

    return () => {
      cancelled = true;
    };
  }, [text]);

  if (!CLIENT_ID) return null;

  return (
    <div
      ref={container}
      aria-busy={!ready}
      className={disabled ? "pointer-events-none opacity-60" : undefined}
    />
  );
}

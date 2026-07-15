import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { GOOGLE_CLIENT_ID } from '../lib/config';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }) => void;
          renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
  }
}

let scriptPromise: Promise<void> | null = null;

// Loads Google's Identity Services script once and reuses it across mounts.
function loadGoogleScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Google Sign-In script'));
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
}

interface GoogleSignInButtonProps {
  onCredential: (idToken: string) => void;
  className: string;
  label: string;
}

// Google's real button is an iframe, so we can't just style it or fake a click on
// it from JS (cross-origin). Instead we render our own button for looks and stack
// the invisible real iframe exactly on top so the actual click lands on Google's widget.
export function GoogleSignInButton({ onCredential, className, label }: GoogleSignInButtonProps) {
  const visibleButtonRef = useRef<HTMLButtonElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number | null>(null);

  useLayoutEffect(() => {
    if (visibleButtonRef.current) {
      setWidth(Math.round(visibleButtonRef.current.getBoundingClientRect().width));
    }
  }, []);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || width === null) return;
    let cancelled = false;

    loadGoogleScript().then(() => {
      if (cancelled || !overlayRef.current || !window.google) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response) => onCredential(response.credential),
      });
      overlayRef.current.innerHTML = '';
      window.google.accounts.id.renderButton(overlayRef.current, {
        theme: 'outline',
        size: 'large',
        width,
      });
    });

    return () => {
      cancelled = true;
    };
  }, [onCredential, width]);

  if (!GOOGLE_CLIENT_ID) return null;

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <button
        ref={visibleButtonRef}
        type="button"
        className={className}
        tabIndex={-1}
        style={{ width: '100%', pointerEvents: 'none' }}
      >
        <img src="/assets/images/google.svg" alt="" className="_google_img" />
        <span>{label}</span>
      </button>
      <div
        ref={overlayRef}
        style={{ position: 'absolute', inset: 0, opacity: 0, overflow: 'hidden' }}
      />
    </div>
  );
}

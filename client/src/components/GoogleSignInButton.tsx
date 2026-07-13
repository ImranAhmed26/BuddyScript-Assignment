import { useEffect, useRef } from 'react';
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

/**
 * Matches the mockup's own button design instead of Google's stock widget:
 * Google's real button is rendered off-screen, and our styled button
 * forwards its click to it — Google still owns the popup/credential flow.
 */
export function GoogleSignInButton({ onCredential, className, label }: GoogleSignInButtonProps) {
  const hiddenButtonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    let cancelled = false;

    loadGoogleScript().then(() => {
      if (cancelled || !hiddenButtonRef.current || !window.google) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response) => onCredential(response.credential),
      });
      window.google.accounts.id.renderButton(hiddenButtonRef.current, {
        theme: 'outline',
        size: 'large',
      });
    });

    return () => {
      cancelled = true;
    };
  }, [onCredential]);

  const triggerSignIn = () => {
    hiddenButtonRef.current?.querySelector<HTMLElement>('div[role="button"]')?.click();
  };

  if (!GOOGLE_CLIENT_ID) return null;

  return (
    <>
      <button type="button" className={className} onClick={triggerSignIn}>
        <img src="/assets/images/google.svg" alt="" className="_google_img" />
        <span>{label}</span>
      </button>
      <div
        ref={hiddenButtonRef}
        style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', opacity: 0, pointerEvents: 'none' }}
      />
    </>
  );
}

"use client";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: GoogleOneTapConfig) => void;
          prompt: (callback?: (notification: PromptNotification) => void) => void;
          renderButton: (
            element: HTMLElement,
            options?: RenderButtonOptions,
          ) => void;
          disableAutoSelect: () => void;
          cancel: () => void;
          revoke: (hint: string, callback: () => void) => void;
        };
      };
    };
  }
}

export interface GoogleOneTapConfig {
  client_id: string;
  callback?: (response: CredentialResponse) => void;
  auto_select?: boolean;
  cancel_on_tap_outside?: boolean;
  context?: "signin" | "signup" | "use";
  display_style?: "page" | "drawer" | "pill";
  dms?: "none" | "invoked" | "auto";
  enable_retry_interstitial?: boolean;
  fedcm_migration_layer?: boolean;
  intermediate_iframe_close_proxy?: boolean;
  itp_support?: boolean;
  login_uri?: string;
  native_button_parameters?: { theme?: string; size?: string; text?: string };
  prompt_parent_id?: string;
  retry_enable?: boolean;
  retry_interstitial_enabled_by_SERVER?: boolean;
  state_cookie_domain?: string;
  ux_mode?: "popup" | "redirect";
}

export interface CredentialResponse {
  credential: string;
  select_by: string;
}

export interface PromptNotification {
  isDisplayed: () => boolean;
  isNotDisplayed: () => boolean;
  isSkippedMoment: () => boolean;
  isDismissedMoment: () => boolean;
  getReason: () => string;
}

export interface RenderButtonOptions {
  theme?: "outline" | "filled_blue" | "filled_black" | "filled_white";
  size?: "large" | "medium" | "small";
  text?: "signin" | "signup" | "continue" | "signup_with" | "signin_with";
  type?: "standard" | "icon";
  shape?: "rectangular" | "pill" | "circle";
  logo_alignment?: "left" | "center";
  width?: number;
  locale?: string;
}

let isInitialized = false;

let storedCallback: ((credential: string) => void) | null = null;
let dismissedCallback: (() => void) | null = null;

export function initGoogleOneTap(clientId: string, onSuccess?: (credential: string) => void) {
  if (isInitialized && window.google?.accounts?.id) return;

  storedCallback = onSuccess || null;

  const script = document.createElement("script");
  script.src = "https://accounts.google.com/gsi/client";
  script.async = true;
  script.defer = true;
  script.onload = () => {
    if (window.google?.accounts?.id) {
      window.google.accounts.id.initialize({
        client_id: clientId,
        auto_select: true,
        callback: (response) => {
          if (response?.credential && storedCallback) {
            storedCallback(response.credential);
          }
        },
      });
      isInitialized = true;
    }
  };
  document.head.appendChild(script);
}

export function triggerGoogleOneTap(
  onDismissed?: () => void,
) {
  dismissedCallback = onDismissed || null;

  if (!window.google?.accounts?.id) return;
  window.google.accounts.id.prompt((notification) => {
    if (notification.isNotDisplayed() || notification.isSkippedMoment() || notification.isDismissedMoment()) {
      dismissedCallback?.();
    }
  });
}

export function cancelGoogleOneTap() {
  window.google?.accounts?.id?.cancel();
}

export function revokeGoogleOneTap(hint: string) {
  window.google?.accounts?.id?.revoke(hint, () => {
    console.log("Google One Tap revoked for:", hint);
  });
}
"use client";

import CookieConsent from "react-cookie-consent";
import Link from "next/link";

export function CookieBanner() {
  return (
    <CookieConsent
      location="bottom"
      buttonText="Aceitar"
      declineButtonText="Recusar"
      enableDeclineButton
      cookieName="cestodamore-consent"
      style={{
        background: "#1f2937", // gray-800
        color: "#f3f4f6",
        padding: "1rem",
        fontSize: "14px",
        alignItems: "center",
      }}
      buttonStyle={{
        backgroundColor: "#f43f5e", // rose-500
        color: "white",
        fontSize: "14px",
        fontWeight: "bold",
        borderRadius: "8px",
        padding: "10px 24px",
      }}
      declineButtonStyle={{
        backgroundColor: "transparent",
        border: "1px solid #9ca3af",
        color: "#9ca3af",
        fontSize: "14px",
        borderRadius: "8px",
        padding: "10px 24px",
      }}
      expires={150}
    >
      Utilizamos cookies para melhorar sua experiência em nossa loja. Ao
      continuar navegando, você concorda com nossa{" "}
      <Link
        href="/privacy-policy"
        className="text-rose-400 underline underline-offset-4 hover:text-rose-300"
      >
        Política de Privacidade
      </Link>
      .
    </CookieConsent>
  );
}

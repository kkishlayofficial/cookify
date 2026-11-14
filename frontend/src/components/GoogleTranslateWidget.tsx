"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    google?: {
      translate: {
        TranslateElement: new (
          options: { pageLanguage: string; includedLanguages: string; autoDisplay: boolean },
          elementId: string,
        ) => unknown;
      };
    };
    googleTranslateElementInit?: () => void;
  }
}

// Google excludes the page's own source language (English) from the hidden
// combo it generates, so "" (its blank "Select Language" option) is what
// actually reverts a translated page back to the original - there's no "en".
const LANGUAGES: { code: string; label: string }[] = [
  { code: "", label: "English" },
  { code: "hi", label: "हिन्दी" },
  { code: "zh-CN", label: "中文" },
  { code: "ru", label: "Русский" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
];

const INCLUDED_LANGUAGES = LANGUAGES.filter((l) => l.code).map((l) => l.code).join(",");

function currentLanguageFromCookie(): string {
  const match = document.cookie.match(/googtrans=\/en\/([a-zA-Z-]+)/);
  return match ? match[1] : "";
}

function setGoogTransCookie(code: string) {
  if (code) {
    document.cookie = `googtrans=/en/${code}; path=/`;
  } else {
    document.cookie = "googtrans=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie = `googtrans=; path=/; domain=${window.location.hostname}; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  }
}

function nudgeCombo(code: string, attemptsLeft = 10) {
  const combo = document.querySelector<HTMLSelectElement>(".goog-te-combo");
  if (!combo) {
    if (attemptsLeft > 0) setTimeout(() => nudgeCombo(code, attemptsLeft - 1), 300);
    return;
  }
  combo.value = code;
  combo.dispatchEvent(new Event("change"));
}

// Setting the cookie and nudging the hidden .goog-te-combo, after first
// firing a "translate" event on window (the hook the widget's internal
// state listens for - also what the popular GTranslate plugin relies on),
// is enough to switch between languages live, no reload.
function applyTranslation(code: string) {
  setGoogTransCookie(code);
  window.dispatchEvent(new Event("translate", { bubbles: true, cancelable: true }));
  window.dispatchEvent(new Event("translate", { bubbles: true, cancelable: true }));
  nudgeCombo(code);
}

function restoreOriginal() {
  // Google's combo ignores the blank "" value for restore, so instead we
  // "translate to English."  Since pageLanguage is "en", Google translates
  // en → en which yields the original text — same live-swap path used for
  // every other language switch, no reload needed.
  const combo = document.querySelector<HTMLSelectElement>(".goog-te-combo");
  if (combo && !combo.querySelector('option[value="en"]')) {
    const opt = document.createElement("option");
    opt.value = "en";
    combo.appendChild(opt);
  }

  applyTranslation("en");

  setTimeout(() => {
    setGoogTransCookie("");
    document.documentElement.className =
      document.documentElement.className.replace(/\btranslated-\w+\b/g, "").trim();
    const banner = document.querySelector(".skiptranslate");
    if (banner instanceof HTMLElement) banner.style.display = "none";
    document.body.style.top = "";
    if (combo) combo.querySelector('option[value="en"]')?.remove();
  }, 2000);
}

export function GoogleTranslateWidget() {
  const [lang, setLang] = useState("");
  const initialized = useRef(false);

  useEffect(() => {
    // One-time sync with the googtrans cookie on mount, so the dropdown
    // reflects an already-active translation (e.g. after a reload).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLang(currentLanguageFromCookie());

    window.googleTranslateElementInit = () => {
      if (!window.google || initialized.current) return;
      initialized.current = true;
      new window.google.translate.TranslateElement(
        { pageLanguage: "en", includedLanguages: INCLUDED_LANGUAGES, autoDisplay: false },
        "google_translate_element",
      );
    };

    return () => {
      delete window.googleTranslateElementInit;
    };
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value;
    if (!next) {
      setLang("");
      restoreOriginal();
      return;
    }
    setLang(next);
    applyTranslation(next);
  }

  return (
    <>
      <Script
        src="https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"
        strategy="afterInteractive"
      />
      <div id="google_translate_element" className="hidden" />
      <div className="relative">
        <select
          aria-label="Language"
          value={lang}
          onChange={handleChange}
          className="w-full cursor-pointer appearance-none rounded-full border border-cream/40 bg-transparent px-3 py-1.5 pr-8 text-sm text-cream focus:outline-none"
        >
          {LANGUAGES.map((l) => (
            <option key={l.code || "en"} value={l.code} className="text-ink">
              {l.label}
            </option>
          ))}
        </select>
        <svg
          className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-cream"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden="true"
        >
          <path d="M5 7.5L10 12.5L15 7.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </>
  );
}

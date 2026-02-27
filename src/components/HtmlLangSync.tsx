"use client";

import { useEffect } from "react";
import { useLocation } from "@/contexts/LocationContext";

export default function HtmlLangSync() {
  const { language } = useLocation();

  useEffect(() => {
    const lang = language || "pt-BR";
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang;
    }
  }, [language]);

  return null;
}

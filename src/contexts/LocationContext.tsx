"use client";
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';


interface LocationInfo {
  country: string;
  countryCode: string;
  currency: string;
  language: string;
  loading: boolean;
  setLanguage?: (lang: string) => void;
  setCurrency?: (cur: string) => void;
}

const defaultLanguage = 'pt-BR';

function normalizeLanguage(lang?: string) {
  if (!lang) return defaultLanguage;
  const lower = lang.toLowerCase();
  if (lower.startsWith('pt')) return 'pt-BR';
  if (lower.startsWith('es')) return 'es-ES';
  return 'en-US';
}

function getBrowserLanguage() {
  if (typeof navigator === 'undefined') return defaultLanguage;
  const raw = (navigator.languages && navigator.languages[0]) || navigator.language || defaultLanguage;
  return normalizeLanguage(raw);
}

function guessCurrency(countryCode?: string, lang?: string) {
  const upper = (countryCode || '').toUpperCase();
  const countryCurrency: Record<string, string> = {
    BR: 'BRL',
    US: 'USD',
    GB: 'GBP',
    ES: 'EUR',
    FR: 'EUR',
    DE: 'EUR',
    IT: 'EUR',
    PT: 'EUR',
    NL: 'EUR',
    BE: 'EUR',
  };
  if (countryCurrency[upper]) return countryCurrency[upper];
  const normalized = normalizeLanguage(lang);
  if (normalized === 'pt-BR') return 'BRL';
  if (normalized === 'es-ES') return 'EUR';
  return 'USD';
}

const defaultLocation: LocationInfo = {
  country: '',
  countryCode: '',
  currency: 'BRL',
  language: defaultLanguage,
  loading: true,
};

const LocationContext = createContext<LocationInfo>(defaultLocation);

export function useLocation() {
  return useContext(LocationContext);
}


export function LocationProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useState<LocationInfo>(() => {
    // Tenta carregar override manual do localStorage
    if (typeof window !== 'undefined') {
      const storedLang = localStorage.getItem('lang');
      const storedCur = localStorage.getItem('cur');
      const browserLang = getBrowserLanguage();
      return {
        ...defaultLocation,
        language: storedLang || browserLang,
        currency: storedCur || guessCurrency(undefined, storedLang || browserLang),
        loading: true,
      };
    }
    return defaultLocation;
  });

  useEffect(() => {
    // Se já houver override manual, não faz fetch
    const storedLang = typeof window !== 'undefined' ? localStorage.getItem('lang') : null;
    const storedCur = typeof window !== 'undefined' ? localStorage.getItem('cur') : null;
    if (storedLang && storedCur) {
      setLocation(loc => ({
        ...loc,
        language: storedLang,
        currency: storedCur,
        loading: false,
      }));
      return;
    }
    async function fetchLocation() {
      try {
        const res = await fetch('https://ipapi.co/json/');
        const data = await res.json();
        const detectedLang = normalizeLanguage(data.languages ? data.languages.split(',')[0] : getBrowserLanguage());
        const detectedCurrency = guessCurrency(data.country_code, detectedLang);
        setLocation(loc => ({
          ...loc,
          country: data.country_name || '',
          countryCode: data.country_code || '',
          currency: data.currency || detectedCurrency,
          language: detectedLang,
          loading: false,
        }));
      } catch {
        const browserLang = getBrowserLanguage();
        setLocation(loc => ({
          ...loc,
          country: '',
          countryCode: '',
          currency: guessCurrency(undefined, browserLang),
          language: browserLang,
          loading: false,
        }));
      }
    }
    fetchLocation();
  }, []);

  // Funções para override manual
  const setLanguage = (lang: string) => {
    setLocation(loc => ({ ...loc, language: lang }));
    if (typeof window !== 'undefined') localStorage.setItem('lang', lang);
  };
  const setCurrency = (cur: string) => {
    setLocation(loc => ({ ...loc, currency: cur }));
    if (typeof window !== 'undefined') localStorage.setItem('cur', cur);
  };

  return (
    <LocationContext.Provider value={{ ...location, setLanguage, setCurrency }}>
      {children}
    </LocationContext.Provider>
  );
}
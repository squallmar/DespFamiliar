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

const defaultLocation: LocationInfo = {
  country: '',
  countryCode: '',
  currency: 'BRL',
  language: 'pt-BR',
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
      return {
        ...defaultLocation,
        language: storedLang || defaultLocation.language,
        currency: storedCur || defaultLocation.currency,
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
        setLocation(loc => ({
          ...loc,
          country: data.country_name || '',
          countryCode: data.country_code || '',
          currency: data.currency || (data.country_code === 'BR' ? 'BRL' : 'USD'),
          language: data.languages ? data.languages.split(',')[0] : (data.country_code === 'BR' ? 'pt-BR' : 'en-US'),
          loading: false,
        }));
      } catch {
        setLocation(loc => ({
          ...loc,
          country: '',
          countryCode: '',
          currency: 'BRL',
          language: 'pt-BR',
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
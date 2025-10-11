"use client";
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface LocationInfo {
  country: string;
  countryCode: string;
  currency: string;
  language: string;
  loading: boolean;
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
  const [location, setLocation] = useState<LocationInfo>(defaultLocation);

  useEffect(() => {
    async function fetchLocation() {
      try {
        // Usando ipapi.co para detectar país, moeda e idioma
        const res = await fetch('https://ipapi.co/json/');
        const data = await res.json();
        setLocation({
          country: data.country_name || '',
          countryCode: data.country_code || '',
          currency: data.currency || (data.country_code === 'BR' ? 'BRL' : 'USD'),
          language: data.languages ? data.languages.split(',')[0] : (data.country_code === 'BR' ? 'pt-BR' : 'en-US'),
          loading: false,
        });
      } catch (e) {
        setLocation({
          country: '',
          countryCode: '',
          currency: 'BRL',
          language: 'pt-BR',
          loading: false,
        });
      }
    }
    fetchLocation();
  }, []);

  return (
    <LocationContext.Provider value={location}>
      {children}
    </LocationContext.Provider>
  );
}
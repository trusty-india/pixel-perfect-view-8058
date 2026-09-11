import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

type CityValue = { city: string; setCity: (c: string) => void };
const CityContext = createContext<CityValue>({ city: "Lucknow", setCity: () => {} });

export function CityProvider({ children }: { children: ReactNode }) {
  const [city, setCity] = useState("Lucknow");

  useEffect(() => {
    const stored = window.localStorage.getItem("29bricks.city");
    if (stored) setCity(stored);
  }, []);

  const value = useMemo<CityValue>(
    () => ({
      city,
      setCity: (c) => {
        setCity(c);
        window.localStorage.setItem("29bricks.city", c);
      },
    }),
    [city],
  );

  return <CityContext.Provider value={value}>{children}</CityContext.Provider>;
}

export function useCity() {
  return useContext(CityContext);
}

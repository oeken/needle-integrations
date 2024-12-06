"use client";

import { type ReactNode, createContext, useContext } from "react";

type SessionContextType = {
  email: string;
};

export const SessionContext = createContext<SessionContextType>({
  email: "",
});

export function useSession() {
  return useContext(SessionContext);
}

type SessionProviderProps = {
  email: string;
  children: ReactNode;
};

export function SessionProvider({ email, children }: SessionProviderProps) {
  return (
    <SessionContext.Provider value={{ email }}>
      {children}
    </SessionContext.Provider>
  );
}

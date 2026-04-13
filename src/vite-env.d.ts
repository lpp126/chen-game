/// <reference types="vite/client" />

interface Window {
  puter?: {
    kv?: {
      get: (key: string) => Promise<unknown>;
      set: (key: string, value: string) => Promise<unknown>;
    };
  };
}

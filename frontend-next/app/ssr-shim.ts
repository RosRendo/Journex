// SSR shim to avoid server-side crashes when libraries call localStorage
// This file is intentionally imported in the server layout so it runs during SSR.

if (typeof window === "undefined") {
  const mockStorage = {
    getItem: (_key: string) => null,
    setItem: (_key: string, _value: string) => {},
    removeItem: (_key: string) => {},
    clear: () => {},
    key: (_index: number) => null,
    length: 0,
  };

  (globalThis as any).localStorage = mockStorage;
  (globalThis as any).sessionStorage = mockStorage;
}

// Also ensure these exist on globalThis
if (typeof (globalThis as any).localStorage === "undefined") {
  (globalThis as any).localStorage = {
    getItem: (_key: string) => null,
    setItem: (_key: string, _value: string) => {},
    removeItem: (_key: string) => {},
    clear: () => {},
    key: (_index: number) => null,
    length: 0,
  };
}

if (typeof (globalThis as any).sessionStorage === "undefined") {
  (globalThis as any).sessionStorage = {
    getItem: (_key: string) => null,
    setItem: (_key: string, _value: string) => {},
    removeItem: (_key: string) => {},
    clear: () => {},
    key: (_index: number) => null,
    length: 0,
  };
}

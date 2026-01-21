export const safeStorage = {
  get(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      try {
        return sessionStorage.getItem(key);
      } catch {
        return null;
      }
    }
  },

  set(key: string, value: string): boolean {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch {
      try {
        sessionStorage.setItem(key, value);
        return true;
      } catch {
        return false;
      }
    }
  },

  remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      try {
        sessionStorage.removeItem(key);
      } catch {
        // Silently fail
      }
    }
  },

  parse<T>(key: string, defaultValue: T): T {
    const value = this.get(key);
    if (!value) return defaultValue;

    try {
      return JSON.parse(value) as T;
    } catch {
      return defaultValue;
    }
  },

  stringify(key: string, value: unknown): boolean {
    try {
      return this.set(key, JSON.stringify(value));
    } catch {
      return false;
    }
  },
};

// Constants
const ACCESS_CODE_KEY = 'org_access';

export const storage = {
  // Save organization access code
  saveAccess: (code: string) => {
    localStorage.setItem(ACCESS_CODE_KEY, code);
  },

  // Get stored access code
  getAccess: (): string | null => {
    try {
      return localStorage.getItem(ACCESS_CODE_KEY);
    } catch {
      return null;
    }
  },

  // Clear stored access
  clearAccess: () => {
    try {
      localStorage.removeItem(ACCESS_CODE_KEY);
    } catch {
      // Ignore errors when clearing
    }
  }
};
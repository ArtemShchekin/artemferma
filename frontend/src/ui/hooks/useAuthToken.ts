import React from 'react';
import { setToken } from '../../api';

const STORAGE_KEY = 'token';

export function useAuthToken() {
  const [token, setTokenState] = React.useState<string | null>(() => localStorage.getItem(STORAGE_KEY));

  React.useEffect(() => {
    setToken(token);
  }, [token]);

  const login = React.useCallback((nextToken: string) => {
    localStorage.setItem(STORAGE_KEY, nextToken);
    setTokenState(nextToken);
  }, []);

  const logout = React.useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setTokenState(null);
  }, []);

  return {
    token,
    login,
    logout,
    isAuthenticated: Boolean(token)
  };
}
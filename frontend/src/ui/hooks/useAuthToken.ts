import React from 'react';
import { setToken as applyTokenToClient } from '../../api';

const STORAGE_KEY = 'token';

export function useAuthToken() {
  const [token, setTokenState] = React.useState<string | null>(() => localStorage.getItem(STORAGE_KEY));

  React.useEffect(() => {
    applyTokenToClient(token);
  }, [token]);

  const login = React.useCallback((nextToken: string) => {
    applyTokenToClient(nextToken);
    localStorage.setItem(STORAGE_KEY, nextToken);
    setTokenState(nextToken);
  }, []);

  const logout = React.useCallback(() => {
    applyTokenToClient(null);
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
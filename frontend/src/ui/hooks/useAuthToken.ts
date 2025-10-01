import React from 'react';
import {
  AUTH_LOGOUT_EVENT,
  AUTH_TOKENS_EVENT,
  AuthTokens,
  applyAuthTokens,
  forceLogout,
  initializeAuthTokens
} from '../../api';

export function useAuthToken() {
  const [tokens, setTokens] = React.useState<AuthTokens | null>(() => initializeAuthTokens());

  React.useEffect(() => {
    const tokenListener: EventListener = (event) => {
      const detail = (event as CustomEvent<AuthTokens | null>).detail ?? null;
      setTokens(detail);
    };

    const logoutListener = () => {
      setTokens(null);
    };

    window.addEventListener(AUTH_TOKENS_EVENT, tokenListener);
    window.addEventListener(AUTH_LOGOUT_EVENT, logoutListener);

    return () => {
      window.removeEventListener(AUTH_TOKENS_EVENT, tokenListener);
      window.removeEventListener(AUTH_LOGOUT_EVENT, logoutListener);
    };
  }, []);

  const login = React.useCallback((nextTokens: AuthTokens) => {
    setTokens(nextTokens);
    applyAuthTokens(nextTokens);
  }, []);

  const logout = React.useCallback(() => {
    setTokens(null);
    forceLogout();
  }, []);

  return {
    token: tokens?.accessToken ?? null,
    refreshToken: tokens?.refreshToken ?? null,
    login,
    logout,
    isAuthenticated: Boolean(tokens?.accessToken)
  };
}
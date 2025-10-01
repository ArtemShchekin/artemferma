import React from 'react';
import AuthPage from './ui/components/AuthPage';
import MainLayout from './ui/components/MainLayout';
import { AuthTokens } from './api';
import { useAuthToken } from './ui/hooks/useAuthToken';

export default function App() {
  const { login, logout, isAuthenticated } = useAuthToken();
  const [toast, setToast] = React.useState<string | null>(null);
  const toastTimeout = React.useRef<number | undefined>();

  const showToast = React.useCallback((message: string) => {
    setToast(message);
    if (toastTimeout.current) {
      window.clearTimeout(toastTimeout.current);
    }
    toastTimeout.current = window.setTimeout(() => {
      setToast(null);
      toastTimeout.current = undefined;
    }, 2500);
  }, []);

  React.useEffect(() => {
    const desired = isAuthenticated ? '/' : '/auth';
    if (window.location.pathname !== desired) {
      window.history.replaceState(null, '', desired);
    }
  }, [isAuthenticated]);


  React.useEffect(() => {
    const handlePop = () => {
      const desired = isAuthenticated ? '/' : '/auth';
      if (window.location.pathname !== desired) {
        window.history.replaceState(null, '', desired);
      }
    };
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, [isAuthenticated]);

  React.useEffect(() => () => {
    if (toastTimeout.current) {
      window.clearTimeout(toastTimeout.current);
    }
  }, []);

  const handleLoginSuccess = (tokens: AuthTokens) => {
    showToast('Вход выполнен');
    login(tokens);
    window.history.replaceState(null, '', '/');
  };

  const handleRegisterSuccess = () => {
    showToast('Регистрация прошла успешно');
  };

  const handleLogout = () => {
    logout();
    window.history.replaceState(null, '', '/auth');
  };

  return (
    <div className="app">
      {isAuthenticated ? (
        <MainLayout onLogout={handleLogout} onToast={showToast} />
      ) : (
        <AuthPage onLoginSuccess={handleLoginSuccess} onRegisterSuccess={handleRegisterSuccess} />
      )}
      {toast ? <div className="toast">{toast}</div> : null}
    </div>
  );
}

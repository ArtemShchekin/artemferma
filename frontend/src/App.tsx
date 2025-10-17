import React from 'react';
import AuthPage from './ui/components/AuthPage';
import MainLayout from './ui/components/MainLayout';
import LocalizationPage from './ui/components/LocalizationPage';
import { AuthTokens } from './api';
import { useAuthToken } from './ui/hooks/useAuthToken';

export default function App() {
  const { login, logout, isAuthenticated } = useAuthToken();

  const [pathname, setPathname] = React.useState<string>(() => window.location.pathname);
  const [toast, setToast] = React.useState<string | null>(null);
  const toastTimeout = React.useRef<number | undefined>();

  const navigate = React.useCallback((path: string, replace = false) => {
    if (replace) {
      window.history.replaceState(null, '', path);
    } else {
      window.history.pushState(null, '', path);
    }
    setPathname(path);
  }, []);

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

  // Обновляем pathname при навигации назад/вперёд
  React.useEffect(() => {
    const handlePop = () => {
      setPathname(window.location.pathname);
    };
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, []);

  // Признак маршрутов локализации
  const isLocalizationRoute = React.useMemo(
    () => pathname.startsWith('/localization'),
    [pathname]
  );

  // Единая точка редиректов: разрешаем /localization*, иначе
  // отправляем на '/' (если авторизован) или '/auth' (если нет)
  React.useEffect(() => {
    if (isLocalizationRoute) return;
    const desired = isAuthenticated ? '/' : '/auth';
    if (pathname !== desired) {
      navigate(desired, true);
    }
  }, [isAuthenticated, isLocalizationRoute, navigate, pathname]);

  // Очистка таймера тостов
  React.useEffect(
    () => () => {
      if (toastTimeout.current) {
        window.clearTimeout(toastTimeout.current);
      }
    },
    []
  );

  const handleLoginSuccess = (tokens: AuthTokens) => {
    showToast('Вход выполнен');
    login(tokens);
    navigate('/', true);
  };

  const handleRegisterSuccess = () => {
    showToast('Регистрация прошла успешно');
  };

  const handleLogout = () => {
    logout();
    navigate('/auth', true);
  };

  return (
    <div className="app">
      {isLocalizationRoute ? (
        <LocalizationPage path={pathname} onNavigate={navigate} />
      ) : isAuthenticated ? (
        <MainLayout onLogout={handleLogout} onToast={showToast} />
      ) : (
        <AuthPage onLoginSuccess={handleLoginSuccess} onRegisterSuccess={handleRegisterSuccess} />
      )}
      {toast ? <div className="toast">{toast}</div> : null}
    </div>
  );
}

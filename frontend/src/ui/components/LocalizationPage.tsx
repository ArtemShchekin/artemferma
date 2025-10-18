import React from 'react';

interface LocalizationPageProps {
  path: string;
  onNavigate: (path: string, replace?: boolean) => void;
}

type ScenarioId = '1' | '2' | '3' | '4' | '5' | '6';

const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? '/api';

const SCENARIO_ORDER: ScenarioId[] = ['1', '2', '3', '4', '5', '6'];

export default function LocalizationPage({ path, onNavigate }: LocalizationPageProps) {
  const segment = React.useMemo(() => {
    if (path === '/localization') return null;
    const parts = path.split('/').filter(Boolean);
    return parts.length >= 2 ? (parts[1] as ScenarioId) : null;
  }, [path]);

  if (!path.startsWith('/localization')) {
    return null;
  }

  if (segment && !SCENARIO_ORDER.includes(segment)) {
    return (
      <div className="localization-page">
        <div className="card localization-card">
          <h2>Сценарий не найден</h2>
          <p>Перейдите к списку сценариев и выберите нужный пример.</p>
          <div className="localization-actions">
            <button className="btn" onClick={() => onNavigate('/localization', true)}>
              К списку сценариев
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!segment) {
    return (
      <div className="localization-page">
        <div className="card localization-card">
          <h2>Локализация ошибок</h2>
          <p className="localization-hint">
            В идеальном случае клиент отправляет POST-запрос с телом {`{ "login": "...", "password": "..." }`}.
          </p>
          <p className="localization-hint">
            Сервер должен ответить статусом 200 OK и вернуть JSON с телом {`{
    "success": true,
    "tokens": {
        "accessToken": "demo-access",
        "refreshToken": "demo-refresh"
    }`}.
          </p>
          <ul className="localization-list">
            {SCENARIO_ORDER.map((id) => (
              <li key={id}>
                <button
                  className="localization-link"
                  onClick={() => onNavigate(`/localization/${id}`)}
                >
                  <span className="localization-id">{id}</span>
                  <span className="localization-text">Сценарий {id}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  return <LocalizationScenario id={segment} onNavigate={onNavigate} />;
}

interface LocalizationScenarioProps {
  id: ScenarioId;
  onNavigate: (path: string, replace?: boolean) => void;
}

function LocalizationScenario({ id, onNavigate }: LocalizationScenarioProps) {
  const [login, setLogin] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [status, setStatus] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const currentIndex = React.useMemo(() => SCENARIO_ORDER.indexOf(id), [id]);
  const prevScenario = currentIndex > 0 ? SCENARIO_ORDER[currentIndex - 1] : null;
  const nextScenario = currentIndex < SCENARIO_ORDER.length - 1 ? SCENARIO_ORDER[currentIndex + 1] : null;

  React.useEffect(() => {
    setStatus(null);
    setLoading(false);
  }, [id]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus(null);

    if (!login || !password) {
      setStatus('Заполните логин и пароль для запуска сценария.');
      return;
    }

    const payload = { login, password };

    switch (id) {
      case '1': {
        console.error('TypeError: Cannot read properties of undefined (reading "sendAuthorizationRequest")');
        break;
      }
      case '2': {
        try {
          setLoading(true);
          const response = await fetch(`${API_BASE}/localization/2`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            // намеренно неверное имя поля пароля
            body: JSON.stringify({ login, pass: password })
          });
          const data = await response.json().catch(() => null);
          if (!response.ok) {
            const message =
              data?.message ??
              data?.details ??
              data?.error ??
              'Ожидалось поле password, но сервер получил pass.';
            console.error(`HTTP ${response.status}: ${message}`);
          } else {
            console.log('Сервер принял запрос, несмотря на поле pass вместо password.');
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          console.error(`Сетевая ошибка при отправке запроса: ${message}`);
        } finally {
          setLoading(false);
        }
        break;
      }
      case '3': {
        try {
          setLoading(true);
          const response = await fetch(`${API_BASE}/localization/3`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          const data = await response.json().catch(() => null);
          if (!response.ok) {
            const message = data?.message ?? data?.error ?? 'Сервер вернул 504 ошибку.';
            console.error(`HTTP ${response.status}: ${message}`);
          } else {
            console.log('Ответ получен, но ожидалась 504 ошибка.');
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          console.error(`Сетевая ошибка: ${message}`);
        } finally {
          setLoading(false);
        }
        break;
      }
      case '4': {
        try {
          setLoading(true);
          const response = await fetch(`${API_BASE}/localization/4`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          const data = await response.json();
          if (data && typeof data === 'object') {
            if (data.success === true) {
              console.error('Некорректная структура ответа: отсутствуют поля login и password.');
            } else if ('login' in data && 'password' in data) {
              console.log('Ответ соответствует ожиданиям: получены login и password.');
            } else {
              console.error('Некорректная структура ответа: отсутствуют ожидаемые поля.');
            }
          } else {
            console.error('Некорректная структура ответа: не объект.');
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          console.error(`Ошибка при обработке ответа: ${message}`);
        } finally {
          setLoading(false);
        }
        break;
      }
      case '5': {
        try {
          setLoading(true);
          const response = await fetch(`${API_BASE}/localization/5`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          if (!response.ok) {
            const message = response.statusText || 'Внутренняя ошибка сервера без тела ответа.';
            console.error(`HTTP ${response.status}: ${message}`);
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          console.error(`Ошибка при выполнении запроса: ${message}`);
        } finally {
          setLoading(false);
        }
        break;
      }
      case '6': {
        try {
          setLoading(true);
          const response = await fetch(`${API_BASE}/localization/6`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          if (response.ok) {
            await response.json();
            console.log('Ответ успешно получен, но не показан пользователю.');
          } else {
            const message = response.statusText || `Ошибка ${response.status}`;
            console.error(`HTTP ${response.status}: ${message}`);
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          console.error(`Ошибка при обработке успешного ответа: ${message}`);
        } finally {
          setLoading(false);
        }
        break;
      }
      default:
        break;
    }
  };

  return (
    <div className="localization-page">
      <div className="card localization-card">
        <div className="localization-header">
          <button className="localization-back" onClick={() => onNavigate('/localization', true)}>
            ← Все сценарии
          </button>
          <span className="localization-label">Сценарий {id}</span>
          <div className="localization-nav">
            <button
              className="localization-arrow"
              type="button"
              disabled={!prevScenario}
              onClick={() => prevScenario && onNavigate(`/localization/${prevScenario}`)}
            >
              ←
            </button>
            <button
              className="localization-arrow"
              type="button"
              disabled={!nextScenario}
              onClick={() => nextScenario && onNavigate(`/localization/${nextScenario}`)}
            >
              →
            </button>
          </div>
        </div>

        <form className="localization-form" onSubmit={submit}>
          <label className="input">
            <span>Логин</span>
            <input
              type="text"
              value={login}
              onChange={(event) => setLogin(event.target.value)}
            />
          </label>
          <label className="input">
            <span>Пароль</span>
            <input
              type="text"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          <button className="btn" type="submit" disabled={loading}>
            {loading ? 'Выполняется...' : 'Вход'}
          </button>
        </form>

        {status ? <div className="localization-status">{status}</div> : null}
      </div>
    </div>
  );
}

import React from 'react';

interface LocalizationPageProps {
  path: string;
  onNavigate: (path: string, replace?: boolean) => void;
}

type ScenarioId = '1' | '2' | '3' | '4' | '5' | '6';

interface ScenarioMeta {
  title: string;
  description: string;
}

const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? '/api';

const SCENARIO_META: Record<ScenarioId, ScenarioMeta> = {
  '1': {
    title: 'Ошибка в консоли',
    description: 'Запрос не уходит, а в консоли появляется сообщение об ошибке.'
  },
  '2': {
    title: 'Некорректное тело запроса',
    description: 'Запрос уходит с полем pass вместо password, поэтому сервер возвращает 400.'
  },
  '3': {
    title: 'Сервер отвечает 504',
    description:
      'Запрос уходит корректно, но сервер слишком долго обрабатывает его и возвращает 504 ошибку.'
  },
  '4': {
    title: 'Неправильные данные в ответе',
    description: 'Запрос успешен, но сервер возвращает поле pass вместо password.'
  },
  '5': {
    title: 'Внутренняя ошибка сервера без уведомления',
    description: 'Запрос завершился с 500 ошибкой, но пользователь не получил уведомления.'
  },
  '6': {
    title: 'Ответ получен, но не показан',
    description: 'Запрос успешен, но результат не отображается пользователю.'
  }
};

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

  if (segment && !SCENARIO_META[segment]) {
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
          <p>
            Выберите сценарий, чтобы показать учащимся, как диагностировать различные проблемы при авторизации.
          </p>
          <ul className="localization-list">
            {SCENARIO_ORDER.map((id) => (
              <li key={id}>
                <button
                  className="localization-link"
                  onClick={() => onNavigate(`/localization/${id}`)}
                >
                  <span className="localization-id">{id}</span>
                  <span className="localization-text">{SCENARIO_META[id].title}</span>
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
  const description = SCENARIO_META[id].description;

  const currentIndex = React.useMemo(() => SCENARIO_ORDER.indexOf(id), [id]);
  const prevScenario = currentIndex > 0 ? SCENARIO_ORDER[currentIndex - 1] : null;
  const nextScenario = currentIndex < SCENARIO_ORDER.length - 1 ? SCENARIO_ORDER[currentIndex + 1] : null;

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
        setStatus('Запрос не был отправлен. Подробности смотрите в консоли.');
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
            setStatus(`Сервер отклонил запрос: ${message}`);
          } else {
            setStatus('Сервер принял запрос, несмотря на поле pass вместо password.');
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          console.error(`Сетевая ошибка при отправке запроса: ${message}`);
          setStatus('Не удалось отправить запрос.');
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
            setStatus(`Сервер вернул ${response.status}: ${message}`);
          } else {
            setStatus('Ответ получен, но ожидалась 504 ошибка.');
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          console.error(`Сетевая ошибка: ${message}`);
          setStatus('Произошла сетевая ошибка при ожидании ответа.');
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
            if ('login' in data && 'pass' in data && !('password' in data)) {
              setStatus('Сервер вернул поле pass вместо password.');
              console.error('Некорректная структура ответа: получены поля login и pass.');
            } else if ('login' in data && 'password' in data) {
              setStatus('Ответ соответствует ожиданиям: получены login и password.');
            } else {
              setStatus('Получена неожиданная структура ответа.');
              console.error('Некорректная структура ответа: отсутствуют ожидаемые поля.');
            }
          } else {
            setStatus('Не удалось прочитать тело ответа.');
            console.error('Некорректная структура ответа: не объект.');
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          console.error(`Ошибка при обработке ответа: ${message}`);
          setStatus('Не удалось обработать ответ сервера.');
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
            setStatus('Сервер вернул ошибку при обработке запроса.');
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          console.error(`Ошибка при обработке успешного ответа: ${message}`);
          setStatus('Не удалось обработать ответ сервера.');
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

        <h2>{SCENARIO_META[id].title}</h2>
        <p className="localization-description">{description}</p>

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

        {id === '5' ? (
          <p className="localization-hint">Обратите внимание, что визуального уведомления об ошибке нет.</p>
        ) : null}
        {id === '6' ? (
          <p className="localization-hint">Ответ получен. Откройте консоль, чтобы увидеть сообщение от разработчика.</p>
        ) : null}
      </div>
    </div>
  );
}

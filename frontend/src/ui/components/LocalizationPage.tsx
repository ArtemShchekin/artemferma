import React from 'react';

interface LocalizationPageProps {
  path: string;
  onNavigate: (path: string, replace?: boolean) => void;
}

type ScenarioId = '1' | '2' | '3' | '4' | '5' | '6' | '7';

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
    description: 'Запрос отправляется, но сервер возвращает 400 из-за неверного тела.'
  },
  '3': {
    title: 'Нет ответа от сервера',
    description: 'Запрос уходит корректно, но сервер отвечает 504 из-за таймаута обработки.'
  },
  '4': {
    title: 'Неправильные данные в ответе',
    description: 'Запрос успешен, но сервер возвращает неожидаемую структуру данных.'
  },
  '5': {
    title: 'Внутренняя ошибка сервера без уведомления',
    description: 'Запрос завершился с 500 ошибкой, но пользователь не получил уведомления.'
  },
  '6': {
    title: 'Ответ получен, но не показан',
    description: 'Запрос успешен, но результат не отображается пользователю.'
  },
  '7': {
    title: 'Запрос уходит не на тот адрес',
    description: 'Тело запроса корректно, но конечная точка указана с опечаткой и возвращает 404.'
  }
};

const SCENARIO_ORDER: ScenarioId[] = ['1', '2', '3', '4', '5', '6', '7'];

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
        console.error(
          'TypeError: Cannot read properties of undefined (reading "send")\n    at submit (LocalizationPage.tsx:142:17)\n    at HTMLButtonElement.onClick (LocalizationPage.tsx:181:7)'
        );
        setStatus('Запрос не был отправлен. Подробности смотрите в консоли.');
        break;
      }
      case '2': {
        try {
          setLoading(true);
          const response = await fetch(`${API_BASE}/localization/2`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ login, pass: password })
          });
          const data = await response.json().catch(() => null);
          if (!response.ok) {
            setStatus(
              data?.details
                ? `Сервер отклонил запрос: ${data.details}`
                : 'Сервер вернул ошибку из-за неверного тела запроса.'
            );
          } else {
            setStatus('Сервер принял запрос, хотя тело было составлено неверно.');
          }
        } catch (error) {
          console.error('Ошибка при отправке запроса', error);
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
          if (response.status === 504) {
            setStatus('Сервер вернул 504 Gateway Timeout: ответ не был подготовлен вовремя.');
          } else if (!response.ok) {
            setStatus(`Запрос завершился ошибкой: ${response.status}`);
          } else {
            setStatus('Ответ получен, но сервер не должен был отвечать успешно.');
          }
        } catch (error) {
          console.error('Ошибка при ожидании ответа', error);
          setStatus('Не удалось получить ответ от сервера.');
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
          if ('login' in data && 'pass' in data) {
            setStatus('Получены поля login и pass вместо ожидаемых login и password.');
          } else {
            setStatus('Ответ соответствует ожиданиям.');
          }
        } catch (error) {
          console.error('Ошибка при обработке ответа', error);
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
            console.error('Сервер вернул 500 без тела ответа.');
          }
        } catch (error) {
          console.error('Ошибка при выполнении запроса', error);
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
            setStatus('Сервер вернул ошибку при обработке запроса.');
          }
        } catch (error) {
          console.error('Ошибка при обработке успешного ответа', error);
          setStatus('Не удалось обработать ответ сервера.');
        } finally {
          setLoading(false);
        }
        break;
      }
      case '7': {
        try {
          setLoading(true);
          const response = await fetch(`${API_BASE}/localizaiton/7`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          if (response.status === 404) {
            setStatus('Запрос ушёл, но вернулся 404: конечная точка указана неверно.');
          } else if (!response.ok) {
            setStatus(`Получена ошибка: ${response.status}`);
          } else {
            setStatus('Ответ получен с неожиданного адреса.');
          }
        } catch (error) {
          console.error('Ошибка при отправке запроса на неверный адрес', error);
          setStatus('Произошла сетевая ошибка при обращении к конечной точке.');
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

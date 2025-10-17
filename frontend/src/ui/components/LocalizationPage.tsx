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
    description:
      'Запрос уходит корректно, но ответ не приходит вовремя (клиент прерывает ожидание; на сервере может случиться таймаут).'
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
      <div classNa

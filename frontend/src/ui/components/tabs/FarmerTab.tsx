import React from 'react';
import { api } from '../../../api';
import { ToastFn } from '../../../types';
import farmerFit from '../../assets/bg-farmer.svg';
import farmerFat from '../../assets/bg-farmer-fat.svg';

interface FarmerProfile {
  isFatFarmer: boolean;
  saladsEaten: number;
  isCoolFarmer: boolean;
  firstName: string | null;
  lastName: string | null;
  middleName: string | null;
  nickname: string | null;
}

interface FarmerTabProps {
  onToast: ToastFn;
}

export function FarmerTab({ onToast }: FarmerTabProps) {
  const [state, setState] = React.useState<FarmerProfile | null>(null);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<FarmerProfile>('/profile');
      setState({
        isFatFarmer: data.isFatFarmer,
        saladsEaten: data.saladsEaten,
        isCoolFarmer: data.isCoolFarmer,
        firstName: data.firstName ?? null,
        lastName: data.lastName ?? null,
        middleName: data.middleName ?? null,
        nickname: data.nickname ?? null
      });    } catch (error) {
      console.error('Failed to load farmer profile', error);
      onToast('Не удалось загрузить фермера');
    } finally {
      setLoading(false);
    }
  }, [onToast]);

  React.useEffect(() => {
    load();
  }, [load]);

  const image = state?.isFatFarmer ? farmerFat : farmerFit;
  const fullName = state
    ? [state.lastName, state.firstName, state.middleName].filter(Boolean).join(' ')
    : '';
  const displayName = state
    ? (state.isCoolFarmer ? state.nickname ?? '' : fullName).trim()
    : '';
  if (loading && !state) {
    return <div className="card">Загрузка...</div>;
  }

  return (
    <div className="card farmer-card">
      <h3>Фермер</h3>
      <p>Следи за рационом фермера — слишком много салатов делают его пухлым!</p>
      <div className="farmer-illustration">
        <img src={image} alt="Фермер" />
      </div>
      <div className="grid" style={{ marginTop: 12 }}>
        <div className="badge">Салатов съедено: {state?.saladsEaten ?? 0}</div>
        {displayName ? <div className="badge">Фермер: {displayName}</div> : null}
      </div>
      <div className="row" style={{ justifyContent: 'flex-end', marginTop: 12 }}>
        <button className="btn" onClick={load} disabled={loading}>
          Обновить
        </button>
      </div>
    </div>
  );
}

export default FarmerTab;
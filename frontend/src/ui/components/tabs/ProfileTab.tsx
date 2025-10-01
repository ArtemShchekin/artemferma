import React from 'react';
import { api } from '../../../api';
import { ToastFn } from '../../../types';
import { SEED_NAMES } from '../../constants/seeds';
import { InputField } from '../InputField';

interface SupplyPrice {
  price: number;
  volume: number;
}

interface ProfileResponse {
  isCoolFarmer: boolean;
  firstName: string | null;
  lastName: string | null;
  middleName: string | null;
  nickname: string | null;
  passport: string | null;
  level: number;
  soldCount: number;
  balance: number;
  yogurtMl: number;
  sunflowerOilMl: number;
  saladsEaten: number;
  isFatFarmer: boolean;
  prices: {
    purchase: { basePrice: number; advPrice: number };
    sale: { basePrice: number; advPrice: number };
    supplies?: { yogurt: SupplyPrice; sunflowerOil: SupplyPrice };
  };
}

interface KitchenSnapshot {
  vegetables: Record<string, number>;
  yogurtMl: number;
  sunflowerOilMl: number;
}

type ProfileForm = Record<string, string>;
type ProfileErrors = Record<string, string>;

interface ProfileTabProps {
  onToast: ToastFn;
}

export function ProfileTab({ onToast }: ProfileTabProps) {
  const [profile, setProfile] = React.useState<ProfileResponse | null>(null);
  const [isCoolFarmer, setIsCoolFarmer] = React.useState(false);
  const [form, setForm] = React.useState<ProfileForm>({});
  const [errors, setErrors] = React.useState<ProfileErrors>({});
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [kitchen, setKitchen] = React.useState<KitchenSnapshot | null>(null);

  const loadProfile = React.useCallback(async () => {
    try {
      setLoadError(null);
      const [profileResult, kitchenResult] = await Promise.allSettled([
        api.get<ProfileResponse>('/profile'),
        api.get<KitchenSnapshot>('/kitchen')
      ]);

      if (profileResult.status !== 'fulfilled') {
        throw profileResult.reason;
      }

      const data = profileResult.value.data;
      setProfile(data);
      if (kitchenResult.status === 'fulfilled') {
        setKitchen(kitchenResult.value.data);
      } else {
        setKitchen(null);
      }
      setIsCoolFarmer(Boolean(data.isCoolFarmer));

      if (data.isCoolFarmer) {
        setForm({ nickname: data.nickname ?? '', passport: data.passport ?? '' });
      } else {
        setForm({
          firstName: data.firstName ?? '',
          lastName: data.lastName ?? '',
          middleName: data.middleName ?? ''
        });
      }
    } catch (error) {
      console.error('Failed to load profile', error);
      setProfile(null);
      setLoadError('Не удалось загрузить профиль');
      setKitchen(null);
    }
  }, []);

  React.useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const updateField = (key: string, value: string) => {
    setForm((previous) => ({ ...previous, [key]: value }));
  };

  const validate = (): boolean => {
    const nextErrors: ProfileErrors = {};

    if (isCoolFarmer) {
      if (!form.nickname) {
        nextErrors.nickname = 'Не заполнено поле';
      } else if (!/^[A-Za-z]{2,15}$/.test(form.nickname)) {
        nextErrors.nickname = 'Ошибка валидации';
      }

      if (!form.passport) {
        nextErrors.passport = 'Не заполнено поле';
      } else if (!/^\d{6}$/.test(form.passport)) {
        nextErrors.passport = 'Ошибка валидации';
@@ -112,60 +135,68 @@ export function ProfileTab({ onToast }: ProfileTabProps) {

    try {
      await api.put('/profile', { isCoolFarmer, ...form });
      onToast('Данные сохранены');
      loadProfile();
    } catch (error) {
      console.error('Failed to save profile', error);
      onToast('Не удалось сохранить данные');
    }
  };

  const toggleCool = (next: boolean) => {
    setIsCoolFarmer(next);
    setErrors({});
    if (next) {
      setForm({ nickname: '', passport: '' });
    } else {
      setForm({ firstName: '', lastName: '', middleName: '' });
    }
  };

  if (!profile) {
    return <div className="card">{loadError ?? 'Загрузка...'}</div>;
  }

  const kitchenVegetables = kitchen?.vegetables ?? {};
  const vegetableEntries = Object.entries(kitchenVegetables)
    .filter(([key]) => key in SEED_NAMES)
    .sort(([a], [b]) => SEED_NAMES[a as keyof typeof SEED_NAMES].localeCompare(SEED_NAMES[b as keyof typeof SEED_NAMES]));

  const fitnessStatus = profile.saladsEaten >= 3 ? 'Ты толстый' : 'Ты худой';
  const fullName = [profile.lastName, profile.firstName, profile.middleName].filter(Boolean).join(' ');
  const displayName = (profile.isCoolFarmer ? profile.nickname ?? '' : fullName).trim();

  return (
    <div className="grid">
      <div className="row" style={{ gap: 8, justifyContent: 'flex-end' }}>
        <div className="badge">Уровень: {profile.level}</div>
        <div className="badge">Продано: {profile.soldCount}</div>
        <div className="badge">Баланс: <span className="money">{profile.balance} ₽</span></div>
        <div className="badge">Салатов съедено: {profile.saladsEaten}</div>
        <div className="badge">{fitnessStatus}</div>
        {displayName ? <div className="badge">Фермер: {displayName}</div> : null}
      </div>

      <div className="card">
        <label className="row" style={{ gap: 8 }}>
          <input type="checkbox" checked={isCoolFarmer} onChange={(event) => toggleCool(event.target.checked)} />
          Ты крутой фермер?
        </label>

        {isCoolFarmer ? (
          <div className="grid grid-2" style={{ marginTop: 12 }}>
            <InputField
              label="Прозвище"
              value={form.nickname ?? ''}
              onChange={(value) => updateField('nickname', value)}
              error={errors.nickname}
            />
            <InputField
              label="Паспорт фермера"
              value={form.passport ?? ''}
              onChange={(value) => updateField('passport', value)}
              error={errors.passport}
            />
          </div>
        ) : (
          <div className="grid grid-3" style={{ marginTop: 12 }}>
@@ -177,49 +208,40 @@ export function ProfileTab({ onToast }: ProfileTabProps) {
            />
            <InputField
              label="Фамилия"
              value={form.lastName ?? ''}
              onChange={(value) => updateField('lastName', value)}
              error={errors.lastName}
            />
            <InputField
              label="Отчество"
              value={form.middleName ?? ''}
              onChange={(value) => updateField('middleName', value)}
              error={errors.middleName}
            />
          </div>
        )}

        <div className="row" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
          <button className="btn" onClick={save}>
            Сохранить
          </button>
        </div>
      </div>

      <div className="card">
        <h3>Цены и запасы</h3>
        <div className="grid" style={{ marginTop: 12 }}>
          <div className="badge">Йогурта на складе: {profile.yogurtMl} мл</div>
          <div className="badge">Масла на складе: {profile.sunflowerOilMl} мл</div>
          {vegetableEntries.map(([type, count]) => (
            <div key={type} className="badge">
              {SEED_NAMES[type as keyof typeof SEED_NAMES]} на складе: {count} шт.
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ProfileTab;
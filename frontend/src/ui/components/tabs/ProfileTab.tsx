import React from 'react';
import { api } from '../../../api';
import { ToastFn } from '../../../types';
import { SEED_NAMES } from '../../constants/seeds';
import { InputField } from '../InputField';

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

const EMPTY_NAME_FORM: ProfileForm = { firstName: '', lastName: '', middleName: '' };
const EMPTY_COOL_FORM: ProfileForm = { nickname: '', passport: '' };

function buildFullName(profile: ProfileResponse) {
  return [profile.lastName, profile.firstName, profile.middleName].filter(Boolean).join(' ');
}

function collectVegetableBadges(kitchen: KitchenSnapshot | null) {
  const entries = Object.entries(kitchen?.vegetables ?? {})
    .filter(([key]) => key in SEED_NAMES)
    .sort(([a], [b]) =>
      SEED_NAMES[a as keyof typeof SEED_NAMES].localeCompare(
        SEED_NAMES[b as keyof typeof SEED_NAMES]
      )
    );

  return entries.map(([type, count]) => ({
    key: type,
    label: `${SEED_NAMES[type as keyof typeof SEED_NAMES]} на складе: ${count} шт.`
  }));
}

export function ProfileTab({ onToast }: ProfileTabProps) {
  const [profile, setProfile] = React.useState<ProfileResponse | null>(null);
  const [kitchen, setKitchen] = React.useState<KitchenSnapshot | null>(null);
  const [isCoolFarmer, setIsCoolFarmer] = React.useState(false);
  const [form, setForm] = React.useState<ProfileForm>(EMPTY_NAME_FORM);
  const [errors, setErrors] = React.useState<ProfileErrors>({});
  const [loadError, setLoadError] = React.useState<string | null>(null);

  const loadProfile = React.useCallback(async () => {
    try {
      setLoadError(null);
      const [{ data: profileData }, kitchenResult] = await Promise.all([
        api.get<ProfileResponse>('/profile'),
        api
          .get<KitchenSnapshot>('/kitchen')
          .then((response) => response)
          .catch((error) => {
            console.error('Failed to load kitchen', error);
            return null;
          })
      ]);

      setProfile(profileData);
      setIsCoolFarmer(Boolean(profileData.isCoolFarmer));
      setKitchen(kitchenResult?.data ?? null);

      if (profileData.isCoolFarmer) {
        setForm({
          nickname: profileData.nickname ?? '',
          passport: profileData.passport ?? ''
        });
      } else {
        setForm({
          firstName: profileData.firstName ?? '',
          lastName: profileData.lastName ?? '',
          middleName: profileData.middleName ?? ''
        });
      }
    } catch (error) {
      console.error('Failed to load profile', error);
      setProfile(null);
      setKitchen(null);
      setLoadError('Не удалось загрузить профиль');
    }
  }, []);

  React.useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const updateField = (key: string, value: string) => {
    setForm((previous) => ({ ...previous, [key]: value }));
  };

  const validate = () => {
    const nextErrors: ProfileErrors = {};

    if (isCoolFarmer) {
      const nickname = form.nickname ?? '';
      const passport = form.passport ?? '';

      if (!nickname) {
        nextErrors.nickname = 'Не заполнено поле';
      } else if (!/^[A-Za-z]{2,15}$/.test(nickname)) {
        nextErrors.nickname = 'Ошибка валидации';
      }

      if (!passport) {
        nextErrors.passport = 'Не заполнено поле';
      } else if (!/^\d{6}$/.test(passport)) {
        nextErrors.passport = 'Ошибка валидации';
      }
    } else {
      const ru = /^[А-ЯЁа-яё\-\s]{2,40}$/;
      for (const field of ['firstName', 'lastName', 'middleName']) {
        const value = form[field] ?? '';
        if (!value) {
          nextErrors[field] = 'Не заполнено поле';
        } else if (!ru.test(value)) {
          nextErrors[field] = 'Ошибка валидации';
        }
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const save = async () => {
    if (!validate()) {
      return;
    }

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
      setForm({
        nickname: profile?.nickname ?? '',
        passport: profile?.passport ?? ''
      });
    } else {
      setForm({
        firstName: profile?.firstName ?? '',
        lastName: profile?.lastName ?? '',
        middleName: profile?.middleName ?? ''
      });
    }  };

  if (!profile) {
    return <div className="card">{loadError ?? 'Загрузка...'}</div>;
  }

  const vegetableBadges = React.useMemo(() => collectVegetableBadges(kitchen), [kitchen]);
  const yogurtLeft = kitchen?.yogurtMl ?? profile.yogurtMl;
  const oilLeft = kitchen?.sunflowerOilMl ?? profile.sunflowerOilMl;
  const fitnessStatus = profile.saladsEaten >= 3 ? 'Ты толстый' : 'Ты худой';
  const displayName = (profile.isCoolFarmer ? profile.nickname ?? '' : buildFullName(profile)).trim();

  return (
    <div className="grid">
      <div className="row" style={{ gap: 8, justifyContent: 'flex-end' }}>
        <div className="badge">Уровень: {profile.level}</div>
        <div className="badge">Продано: {profile.soldCount}</div>
        <div className="badge">
          Баланс: <span className="money">{profile.balance} ₽</span>
        </div>
        <div className="badge">Салатов съедено: {profile.saladsEaten}</div>
        <div className="badge">{fitnessStatus}</div>
        {displayName ? <div className="badge">Фермер: {displayName}</div> : null}
      </div>

      <div className="card">
        <label className="row" style={{ gap: 8 }}>
          <input
            type="checkbox"
            checked={isCoolFarmer}
            onChange={(event) => toggleCool(event.target.checked)}
          />
          Ты крутой фермер?
        </label>
@@ -221,39 +235,43 @@ export function ProfileTab({ onToast }: ProfileTabProps) {
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
          <div className="badge">Йогурта на складе: {yogurtLeft} мл</div>
          <div className="badge">Масла на складе: {oilLeft} мл</div>
          {vegetableBadges.length > 0 ? (
            vegetableBadges.map((badge) => (
              <div key={badge.key} className="badge">
                {badge.label}
              </div>
            ))
          ) : (
            <div className="badge">Данные по овощам недоступны</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProfileTab;
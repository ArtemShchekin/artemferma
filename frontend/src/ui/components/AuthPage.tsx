import React from 'react';
import { api } from '../../api';
import { InputField } from './InputField';

interface AuthPageProps {
  onLoginSuccess: (token: string) => void;
  onRegisterSuccess: () => void;
}

interface LoginFormProps {
  onSuccess: (token: string) => void;
  onSwitchToRegister: () => void;
}

interface RegisterFormProps {
  onSuccess: () => void;
  onSwitchToLogin: () => void;
}

export function AuthPage({ onLoginSuccess, onRegisterSuccess }: AuthPageProps) {
  const [mode, setMode] = React.useState<'login' | 'register'>('login');

  return (
    <div className="auth-page">
      <div className="modal-backdrop auth-overlay">
        <div className="card auth-modal">
          {mode === 'login' ? (
            <LoginForm onSuccess={onLoginSuccess} onSwitchToRegister={() => setMode('register')} />
          ) : (
            <RegisterForm
              onSuccess={() => {
                onRegisterSuccess();
                setMode('login');
              }}
              onSwitchToLogin={() => setMode('login')}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function LoginForm({ onSuccess, onSwitchToRegister }: LoginFormProps) {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [emailError, setEmailError] = React.useState<string | null>(null);
  const [passwordError, setPasswordError] = React.useState<string | null>(null);

  const validate = () => {
    setEmailError(null);
    setPasswordError(null);

    if (!email) {
      setEmailError('Не заполнено поле');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('Ошибка валидации');
      return false;
    }
    if (!password) {
      setPasswordError('Не заполнено поле');
      return false;
    }

    return true;
  };

  const submit = async () => {
    if (!validate()) {
      return;
    }

    try {
      const { data } = await api.post<{ accessToken?: string }>('/auth/login', { email, password });
      if (!data?.accessToken) {
        throw new Error('Missing access token');
      }
      onSuccess(data.accessToken);
    } catch (error) {
      setPasswordError('Ошибка валидации');
    }
  };

  return (
    <div className="auth-content">
      <h3>Авторизация</h3>
      <div className="grid">
        <InputField label="Email" value={email} onChange={setEmail} error={emailError} />
        <InputField label="Пароль" type="password" value={password} onChange={setPassword} error={passwordError} />
        <div className="auth-alt">
          <span className="auth-question">Нет аккаунта?</span>
          <button type="button" className="auth-secondary" onClick={onSwitchToRegister}>
            Зарегистрироваться
          </button>
        </div>
      </div>
      <div className="auth-controls auth-single">
        <button className="btn" onClick={submit}>
          Войти
        </button>
      </div>
    </div>
  );
}

function RegisterForm({ onSuccess, onSwitchToLogin }: RegisterFormProps) {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirm, setConfirm] = React.useState('');
  const [emailError, setEmailError] = React.useState<string | null>(null);
  const [passwordError, setPasswordError] = React.useState<string | null>(null);
  const [confirmError, setConfirmError] = React.useState<string | null>(null);

  const validate = () => {
    setEmailError(null);
    setPasswordError(null);
    setConfirmError(null);

    if (!email) {
      setEmailError('Не заполнено поле');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('Ошибка валидации');
      return false;
    }
    if (!password) {
      setPasswordError('Не заполнено поле');
      return false;
    }
    if (!/^(?=.*\d)[A-Za-z\d]{6,20}$/.test(password)) {
      setPasswordError('Ошибка валидации');
      return false;
    }
    if (!confirm) {
      setConfirmError('Не заполнено поле');
      return false;
    }
    if (confirm !== password) {
      setConfirmError('Ошибка валидации');
      return false;
    }

    return true;
  };

  const submit = async () => {
    if (!validate()) {
      return;
    }

    try {
      await api.post('/auth/register', { email, password });
      onSuccess();
      setEmail('');
      setPassword('');
      setConfirm('');
    } catch (error) {
      setEmailError('Ошибка валидации');
    }
  };

  return (
    <div className="auth-content">
      <h3>Регистрация</h3>
      <div className="grid">
        <InputField label="Email" value={email} onChange={setEmail} error={emailError} />
        <InputField label="Пароль" type="password" value={password} onChange={setPassword} error={passwordError} />
        <InputField label="Подтверждение пароля" type="password" value={confirm} onChange={setConfirm} error={confirmError} />
      </div>
      <div className="auth-controls">
        <div className="auth-alt">
          <span className="auth-question">Уже есть аккаунт?</span>
          <button type="button" className="auth-secondary" onClick={onSwitchToLogin}>
            Войти
          </button>
        </div>
        <button className="btn" onClick={submit}>
          Зарегистрироваться
        </button>
      </div>
    </div>
  );
}

export default AuthPage;
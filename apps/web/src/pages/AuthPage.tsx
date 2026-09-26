import { useState, type FormEvent } from 'react';
import { KeyRound } from 'lucide-react';
import { api, ApiError, type ProfileUser } from '@/api/client';
import { Button } from '@/components/ui/Button';
import { FieldLabel, TextInput } from '@/components/ui/Field';

type AuthMode = 'login' | 'register' | 'forgot' | 'reset';

const initialResetToken = new URLSearchParams(window.location.search).get('resetToken') ?? '';

export function AuthPage({ onAuthenticated }: { onAuthenticated: (user: ProfileUser) => void }) {
  const [mode, setMode] = useState<AuthMode>(initialResetToken ? 'reset' : 'login');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setPassword('');
    setConfirmPassword('');
    setError(null);
    setMessage(null);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      if (mode === 'forgot') {
        const result = await api.forgotPassword(email);
        setMessage(result.message);
      } else if (mode === 'reset') {
        if (password !== confirmPassword) throw new Error('Пароли не совпадают');
        await api.resetPassword(initialResetToken, password);
        window.history.replaceState({}, '', window.location.pathname);
        switchMode('login');
        setMessage('Пароль изменён. Теперь можно войти.');
      } else {
        const result = mode === 'register'
          ? await api.register(displayName, email, password)
          : await api.login(email, password);
        onAuthenticated(result.user);
      }
    } catch (caught) {
      setError(
        caught instanceof ApiError || caught instanceof Error
          ? caught.message
          : 'Не удалось выполнить запрос',
      );
    } finally {
      setPending(false);
    }
  };

  const title = mode === 'register'
    ? 'Создать профиль'
    : mode === 'forgot'
      ? 'Восстановление пароля'
      : mode === 'reset'
        ? 'Новый пароль'
        : 'Вход в GameStock';

  return (
    <main className="flex min-h-screen items-center justify-center bg-app px-4">
      <section className="w-full max-w-[420px] rounded-xl border border-line-2 bg-panel shadow-panel">
        <div className="border-b border-line px-6 py-5">
          <div className="mb-3 flex size-10 items-center justify-center rounded-lg border border-line-2 bg-panel-2 text-accent">
            <KeyRound size={20} />
          </div>
          <h1 className="text-[20px] font-semibold text-ink">{title}</h1>
          <p className="mt-1 text-[12px] leading-relaxed text-ink-3">
            {mode === 'forgot'
              ? 'Мы отправим одноразовую ссылку, если профиль с такой почтой существует.'
              : mode === 'reset'
                ? 'Ссылка действует 30 минут и может быть использована один раз.'
                : 'У каждого профиля собственные зашифрованные ключи интеграций.'}
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4 px-6 py-5">
          {mode === 'register' ? (
            <label className="block space-y-1.5">
              <FieldLabel>Имя</FieldLabel>
              <TextInput value={displayName} onChange={(event) => setDisplayName(event.target.value)} autoComplete="name" required minLength={2} className="h-9" />
            </label>
          ) : null}

          {mode !== 'reset' ? (
            <label className="block space-y-1.5">
              <FieldLabel>Электронная почта</FieldLabel>
              <TextInput type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required className="h-9" />
            </label>
          ) : null}

          {mode !== 'forgot' ? (
            <label className="block space-y-1.5">
              <FieldLabel>{mode === 'reset' ? 'Новый пароль' : 'Пароль'}</FieldLabel>
              <TextInput type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required minLength={10} className="h-9" />
              {mode !== 'login' ? <span className="block text-[11px] text-ink-4">Минимум 10 символов</span> : null}
            </label>
          ) : null}

          {mode === 'reset' ? (
            <label className="block space-y-1.5">
              <FieldLabel>Повторите пароль</FieldLabel>
              <TextInput type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" required minLength={10} className="h-9" />
            </label>
          ) : null}

          {error ? <p className="rounded-md border border-[#4a2326] bg-[#2a1618] px-3 py-2 text-[12px] text-neg">{error}</p> : null}
          {message ? <p className="rounded-md border border-[#1f4a34] bg-[#13271d] px-3 py-2 text-[12px] text-pos">{message}</p> : null}

          <Button type="submit" variant="primary" size="md" className="w-full" disabled={pending}>
            {pending ? 'Подождите…' : mode === 'register' ? 'Создать профиль' : mode === 'forgot' ? 'Отправить ссылку' : mode === 'reset' ? 'Сохранить пароль' : 'Войти'}
          </Button>

          {mode === 'login' ? (
            <button type="button" onClick={() => switchMode('forgot')} className="w-full text-center text-[12px] text-ink-3 hover:text-ink">Забыли пароль?</button>
          ) : null}
          <button type="button" onClick={() => switchMode(mode === 'register' ? 'login' : mode === 'login' ? 'register' : 'login')} className="w-full text-center text-[12px] text-ink-3 hover:text-ink">
            {mode === 'register' ? 'Уже есть профиль — войти' : mode === 'login' ? 'Нет профиля — зарегистрироваться' : 'Вернуться ко входу'}
          </button>
        </form>
      </section>
    </main>
  );
}

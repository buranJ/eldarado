import { useState, type FormEvent } from 'react';
import { KeyRound } from 'lucide-react';
import { api, ApiError, type ProfileUser } from '@/api/client';
import { Button } from '@/components/ui/Button';
import { FieldLabel, TextInput } from '@/components/ui/Field';

export function AuthPage({ onAuthenticated }: { onAuthenticated: (user: ProfileUser) => void }) {
  const [registering, setRegistering] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const result = registering
        ? await api.register(displayName, email, password)
        : await api.login(email, password);
      onAuthenticated(result.user);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Не удалось выполнить вход');
    } finally {
      setPending(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-app px-4">
      <section className="w-full max-w-[420px] rounded-xl border border-line-2 bg-panel shadow-panel">
        <div className="border-b border-line px-6 py-5">
          <div className="mb-3 flex size-10 items-center justify-center rounded-lg border border-line-2 bg-panel-2 text-accent">
            <KeyRound size={20} />
          </div>
          <h1 className="text-[20px] font-semibold text-ink">
            {registering ? 'Создать профиль' : 'Вход в GameStock'}
          </h1>
          <p className="mt-1 text-[12px] leading-relaxed text-ink-3">
            У каждого профиля собственные зашифрованные ключи интеграций.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4 px-6 py-5">
          {registering ? (
            <label className="block space-y-1.5">
              <FieldLabel>Имя</FieldLabel>
              <TextInput
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                autoComplete="name"
                required
                minLength={2}
                className="h-9"
              />
            </label>
          ) : null}
          <label className="block space-y-1.5">
            <FieldLabel>Электронная почта</FieldLabel>
            <TextInput
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
              className="h-9"
            />
          </label>
          <label className="block space-y-1.5">
            <FieldLabel>Пароль</FieldLabel>
            <TextInput
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={registering ? 'new-password' : 'current-password'}
              required
              minLength={10}
              className="h-9"
            />
            {registering ? (
              <span className="block text-[11px] text-ink-4">Минимум 10 символов</span>
            ) : null}
          </label>
          {error ? (
            <p className="rounded-md border border-[#4a2326] bg-[#2a1618] px-3 py-2 text-[12px] text-neg">
              {error}
            </p>
          ) : null}
          <Button type="submit" variant="primary" size="md" className="w-full" disabled={pending}>
            {pending ? 'Подождите…' : registering ? 'Создать профиль' : 'Войти'}
          </Button>
          <button
            type="button"
            onClick={() => {
              setRegistering((value) => !value);
              setError(null);
            }}
            className="w-full text-center text-[12px] text-ink-3 hover:text-ink"
          >
            {registering ? 'Уже есть профиль — войти' : 'Нет профиля — зарегистрироваться'}
          </button>
        </form>
      </section>
    </main>
  );
}

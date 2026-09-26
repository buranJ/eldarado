import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import * as Sentry from '@sentry/react';
import { App } from './app/App';
import './index.css';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN || undefined,
  environment: import.meta.env.MODE,
  enabled: Boolean(import.meta.env.VITE_SENTRY_DSN),
  tracesSampleRate: 0.05,
});

const container = document.getElementById('root');
if (!container) throw new Error('Root container #root not found');

createRoot(container).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={<main className="flex min-h-screen items-center justify-center bg-app p-6 text-ink">Произошла ошибка интерфейса. Обновите страницу.</main>}>
      <App />
    </Sentry.ErrorBoundary>
  </StrictMode>,
);

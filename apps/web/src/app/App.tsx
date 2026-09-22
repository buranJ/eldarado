import { BrowserRouter } from 'react-router-dom';
import { AppRoutes } from './routes';
import { ToastProvider } from './providers/ToastProvider';
import { AppStateProvider } from './providers/AppStateProvider';
import { AuthProvider } from './providers/AuthProvider';

export function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <AppStateProvider>
            <AppRoutes />
          </AppStateProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

import { BrowserRouter } from 'react-router-dom';
import { AppRoutes } from './routes';
import { ToastProvider } from './providers/ToastProvider';
import { AppStateProvider } from './providers/AppStateProvider';

export function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AppStateProvider>
          <AppRoutes />
        </AppStateProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

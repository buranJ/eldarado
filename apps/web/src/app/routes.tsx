import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from '@/layouts/AppLayout';
import { OverviewPage } from '@/pages/OverviewPage';
import { MarketplacePage } from '@/pages/MarketplacePage';
import { TopAccountsPage } from '@/pages/TopAccountsPage';
import { InventoryPage } from '@/pages/InventoryPage';
import { ListingsPage } from '@/pages/ListingsPage';
import { SalesPage } from '@/pages/SalesPage';
import { AiAnalysisPage } from '@/pages/AiAnalysisPage';
import { FinancePage } from '@/pages/FinancePage';
import { SettingsPage } from '@/pages/SettingsPage';

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<OverviewPage />} />
        <Route path="marketplace" element={<MarketplacePage />} />
        <Route path="top-accounts" element={<TopAccountsPage />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="listings" element={<ListingsPage />} />
        <Route path="sales" element={<SalesPage />} />
        <Route path="ai-analysis" element={<AiAnalysisPage />} />
        <Route path="finance" element={<FinancePage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

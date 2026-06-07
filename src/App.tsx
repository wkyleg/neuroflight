import { lazy, Suspense } from 'react';
import { HashRouter, Route, Routes } from 'react-router';
import { ErrorBoundary } from './app/ErrorBoundary.tsx';
import { GameScreen } from './app/screens/GameScreen.tsx';
import { HowItWorksScreen } from './app/screens/HowItWorksScreen.tsx';
import { MainMenu } from './app/screens/MainMenu.tsx';
import { SettingsScreen } from './app/screens/SettingsScreen.tsx';
import { SummaryScreen } from './app/screens/SummaryScreen.tsx';
import { NeuroProvider } from './neuro/NeuroProvider.tsx';

const AssetSandbox = import.meta.env.DEV
  ? lazy(() => import('./app/screens/AssetSandbox.tsx').then((module) => ({ default: module.AssetSandbox })))
  : null;

export function App() {
  return (
    <NeuroProvider>
      <HashRouter>
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<MainMenu />} />
            {AssetSandbox && (
              <Route
                path="/assets"
                element={
                  <Suspense fallback={null}>
                    <AssetSandbox />
                  </Suspense>
                }
              />
            )}
            <Route path="/fly" element={<GameScreen />} />
            <Route path="/how-it-works" element={<HowItWorksScreen />} />
            <Route path="/summary" element={<SummaryScreen />} />
            <Route path="/settings" element={<SettingsScreen />} />
          </Routes>
        </ErrorBoundary>
      </HashRouter>
    </NeuroProvider>
  );
}

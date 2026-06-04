import { HashRouter, Route, Routes } from 'react-router';
import { ErrorBoundary } from './app/ErrorBoundary.tsx';
import { AssetSandbox } from './app/screens/AssetSandbox.tsx';
import { GameScreen } from './app/screens/GameScreen.tsx';
import { MainMenu } from './app/screens/MainMenu.tsx';
import { SettingsScreen } from './app/screens/SettingsScreen.tsx';
import { SummaryScreen } from './app/screens/SummaryScreen.tsx';
import { NeuroProvider } from './neuro/NeuroProvider.tsx';

export function App() {
  return (
    <NeuroProvider>
      <HashRouter>
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<MainMenu />} />
            <Route path="/assets" element={<AssetSandbox />} />
            <Route path="/fly" element={<GameScreen />} />
            <Route path="/summary" element={<SummaryScreen />} />
            <Route path="/settings" element={<SettingsScreen />} />
          </Routes>
        </ErrorBoundary>
      </HashRouter>
    </NeuroProvider>
  );
}

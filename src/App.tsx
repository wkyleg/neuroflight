import { HashRouter, Route, Routes } from 'react-router';
import { GameScreen } from './app/screens/GameScreen.tsx';
import { MainMenu } from './app/screens/MainMenu.tsx';
import { SettingsScreen } from './app/screens/SettingsScreen.tsx';
import { SummaryScreen } from './app/screens/SummaryScreen.tsx';
import { NeuroProvider } from './neuro/NeuroProvider.tsx';

export function App() {
  return (
    <NeuroProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<MainMenu />} />
          <Route path="/fly" element={<GameScreen />} />
          <Route path="/summary" element={<SummaryScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
        </Routes>
      </HashRouter>
    </NeuroProvider>
  );
}

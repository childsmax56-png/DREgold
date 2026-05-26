import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { SettingsProvider } from './SettingsContext.tsx';
import { ErrorBoundary } from './ErrorBoundary.tsx';
import { PlaylistProvider } from './PlaylistContext.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <SettingsProvider>
        <PlaylistProvider>
          <App />
        </PlaylistProvider>
      </SettingsProvider>
    </ErrorBoundary>
  </StrictMode>,
);

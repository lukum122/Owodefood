import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initInstallPrompt } from './installPrompt';

// Must run before React renders: the browser's install event can fire
// very early and is lost if nobody is listening yet.
initInstallPrompt();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

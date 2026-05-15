// Global error handler for debugging blank page issues
window.onerror = function(message, source, lineno, colno, error) {
  const node = document.createElement('div');
  node.style.position = 'fixed';
  node.style.top = '0';
  node.style.left = '0';
  node.style.background = 'red';
  node.style.color = 'white';
  node.style.padding = '20px';
  node.style.zIndex = '99999';
  node.style.fontSize = '12px';
  node.style.wordBreak = 'break-all';
  node.innerHTML = `Error: ${message}<br/>at ${source}:${lineno}:${colno}`;
  document.body.appendChild(node);
  return false;
};

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

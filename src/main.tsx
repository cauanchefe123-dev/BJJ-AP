import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Proteção para evitar travamentos do React ('insertBefore' ou 'removeChild' em Node)
// causados por tradução automática do navegador ou extensões que modificam a árvore DOM.
if (typeof window !== 'undefined') {
  // Detector de retorno do popup do Spotify (para Vercel e produção)
  const urlParams = new URLSearchParams(window.location.search);
  const spotifyCode = urlParams.get('code');
  const spotifyError = urlParams.get('error');
  if ((spotifyCode || spotifyError) && window.opener && window.location.pathname.includes('/api/spotify/callback')) {
    if (spotifyCode) {
      window.opener.postMessage({ type: 'SPOTIFY_AUTH_CODE', code: spotifyCode }, '*');
    } else if (spotifyError) {
      window.opener.postMessage({ type: 'SPOTIFY_AUTH_ERROR', error: spotifyError }, '*');
    }
    window.close();
  }
}

if (typeof window !== 'undefined' && typeof Node !== 'undefined' && Node.prototype) {
  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function <T extends Node>(newNode: T, referenceNode: Node | null): T {
    if (referenceNode && referenceNode.parentNode !== this) {
      if (originalInsertBefore) {
        try {
          return originalInsertBefore.call(this, newNode, null) as T;
        } catch (e) {
          return newNode;
        }
      }
      return newNode;
    }
    return originalInsertBefore.call(this, newNode, referenceNode) as T;
  };

  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function <T extends Node>(child: T): T {
    if (child && child.parentNode !== this) {
      return child;
    }
    return originalRemoveChild.call(this, child) as T;
  };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

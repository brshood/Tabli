  
  import { createRoot } from "react-dom/client";
  import App from "./App.tsx";
  import "./index.css";

  // Register service worker for PWA and push notifications (iOS compatible)
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('[SW] Service Worker registered successfully:', registration.scope);
          // Check for updates
          registration.update();
        })
        .catch((error) => {
          console.error('[SW] Service Worker registration failed:', error);
        });
    });
  }

  createRoot(document.getElementById("root")!).render(<App />);
  
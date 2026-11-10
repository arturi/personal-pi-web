import "./fonts.css";
import "./components/PiWebApp";

void retireLegacyServiceWorkers();

async function retireLegacyServiceWorkers(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map(async (registration) => await registration.unregister()));
    if ("caches" in globalThis) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(async (cacheName) => await caches.delete(cacheName)));
    }
  } catch (error) {
    console.warn("Failed to retire a legacy service worker", error);
  }
}

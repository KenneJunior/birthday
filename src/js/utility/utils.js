// Utility: Fetch manifest and get app name
export async function getAppName() {
  // Find manifest link
  const manifestLink = document.querySelector('link[rel="manifest"]');
  if (!manifestLink) return null;
  try {
    const res = await fetch(manifestLink.href);
    if (!res.ok) return null;
    const manifest = await res.json();
    return manifest.name || manifest.short_name || null;
  } catch {
    return null;
  }
}

// Utility: for syncronous wait/delay
export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

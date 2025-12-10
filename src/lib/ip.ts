// Utility to get user IP address
let cachedIp: string | null = null;
let ipPromise: Promise<string> | null = null;

export const getUserIP = async (): Promise<string> => {
  // Return cached IP if available
  if (cachedIp) {
    return cachedIp;
  }

  // Return existing promise if already fetching
  if (ipPromise) {
    return ipPromise;
  }

  // Create new promise to fetch IP
  ipPromise = new Promise(async (resolve) => {
    try {
      // Try multiple IP detection services (fallback chain)
      const services = [
        'https://api.ipify.org?format=json',
        'https://api.ip.sb/ip',
        'https://icanhazip.com',
      ];

      for (const service of services) {
        try {
          if (service.includes('ipify')) {
            const response = await fetch(service);
            const data = await response.json();
            cachedIp = data.ip;
            if (cachedIp) {
              resolve(cachedIp);
              return;
            }
          } else if (service.includes('ip.sb')) {
            const response = await fetch(service);
            const text = await response.text();
            cachedIp = text.trim();
            if (cachedIp) {
              resolve(cachedIp);
              return;
            }
          } else {
            const response = await fetch(service);
            const text = await response.text();
            cachedIp = text.trim();
            if (cachedIp) {
              resolve(cachedIp);
              return;
            }
          }
        } catch (error) {
          console.warn(`Failed to get IP from ${service}:`, error);
          continue;
        }
      }

      // If all services fail, generate a fallback ID based on browser fingerprint
      const fallbackId = generateFallbackId();
      cachedIp = fallbackId;
      resolve(cachedIp);
    } catch (error) {
      // Final fallback
      const fallbackId = generateFallbackId();
      cachedIp = fallbackId;
      resolve(cachedIp);
    }
  });

  return ipPromise;
};

// Generate a fallback ID based on browser fingerprint
function generateFallbackId(): string {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx?.fillText('Browser fingerprint', 2, 2);
  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset(),
    canvas.toDataURL(),
  ].join('|');

  // Simple hash function
  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  return `fp_${Math.abs(hash).toString(36)}`;
}

// Get IP synchronously if already cached, otherwise return null
export const getCachedIP = (): string | null => {
  return cachedIp;
};


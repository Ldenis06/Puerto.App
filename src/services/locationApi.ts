export interface LocationResult {
  lat: number;
  lng: number;
  accuracy?: number;
  source: 'gps' | 'ip_api' | 'manual' | 'preset';
  label: string;
  timestamp: string;
}

// Known landmarks in Puerto Madero for rapid positioning and reference
export const PUERTO_MADERO_LANDMARKS = [
  { id: 'puente', name: 'Puente de la Mujer', lat: -34.6083, lng: -58.3644, description: 'Dique 3 - Punto neurálgico' },
  { id: 'antares', name: 'Antares Puerto Madero', lat: -34.6115, lng: -58.3638, description: 'Dique 2 - Cervecería del grupo' },
  { id: 'faena', name: 'Hotel Faena', lat: -34.6142, lng: -58.3621, description: 'Dique 2 - Martha Salotti' },
  { id: 'casino', name: 'Casino Buenos Aires', lat: -34.6185, lng: -58.3582, description: 'Dársena Sur - Buques flotantes' },
  { id: 'yacht', name: 'Yacht Club Puerto Madero', lat: -34.6030, lng: -58.3620, description: 'Dique 4 - Marina norte' },
  { id: 'fragata', name: 'Fragata Sarmiento', lat: -34.6052, lng: -58.3662, description: 'Dique 3 - Museo flotante' },
  { id: 'dique1', name: 'Dique 1 (Madero Harbour)', lat: -34.6190, lng: -58.3615, description: 'Extremo sur de los diques' },
];

/**
 * Reverse geocode coordinates using client-side reverse geocoding API
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  // Check if it's very close to one of the landmarks in Puerto Madero (< 100m)
  for (const landmark of PUERTO_MADERO_LANDMARKS) {
    const dLat = Math.abs(landmark.lat - lat);
    const dLng = Math.abs(landmark.lng - lng);
    if (dLat < 0.001 && dLng < 0.001) {
      return landmark.name;
    }
  }

  // Check if within Puerto Madero general bounds
  if (lat >= -34.63 && lat <= -34.59 && lng >= -58.38 && lng <= -58.34) {
    return 'Puerto Madero, CABA';
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=es`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json();
      const parts = [
        data.locality || data.city || data.localityInfo?.administrative?.[3]?.name,
        data.principalSubdivision || data.countryName
      ].filter(Boolean);
      if (parts.length > 0) {
        return parts.join(', ');
      }
    }
  } catch {
    // Fallback quietly
  }

  return `Ubicación GPS (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
}

/**
 * Fetches user location using IP Geolocation API as a fallback when browser GPS is restricted
 */
export async function fetchIpGeolocation(): Promise<{ lat: number; lng: number; label: string } | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const res = await fetch('https://get.geojs.io/v1/ip/geo.json', {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      const lat = parseFloat(data.latitude);
      const lng = parseFloat(data.longitude);
      if (!isNaN(lat) && !isNaN(lng)) {
        const city = data.city || data.region || 'Tu zona aproximada';
        return { lat, lng, label: `${city} (Vía IP de Red)` };
      }
    }
  } catch {
    // Fallback quietly
  }

  return null;
}

/**
 * Direct request for real cell phone / browser GPS.
 * Gives user up to 25 seconds to tap "Permitir / Allow" on mobile.
 */
export function requestRealDeviceGps(timeoutMs = 25000): Promise<LocationResult> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('La geolocalización no está soportada en tu navegador o celular.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        const label = await reverseGeocode(latitude, longitude);
        resolve({
          lat: latitude,
          lng: longitude,
          accuracy,
          source: 'gps',
          label: label || 'GPS del celular en vivo',
          timestamp: new Date().toISOString(),
        });
      },
      (err) => {
        let message = 'No se pudo obtener la ubicación de tu celular.';
        if (err.code === 1) {
          message = 'Permiso denegado: Por favor habilita el permiso de Ubicación en tu celular o navegador.';
        } else if (err.code === 2) {
          message = 'Señal GPS no disponible. Asegúrate de tener la Ubicación (GPS) encendida en tu celular.';
        } else if (err.code === 3) {
          message = 'Tiempo de espera agotado buscando señal GPS de tu celular.';
        }
        reject(new Error(message));
      },
      {
        enableHighAccuracy: true,
        timeout: timeoutMs,
        maximumAge: 0, // Always get fresh real position
      }
    );
  });
}

/**
 * Resilient location acquisition with priority for cell phone GPS:
 * 1. Real Device GPS (High Accuracy, 20s timeout)
 * 2. Real Device GPS (Standard Accuracy, 10s timeout)
 * 3. Network IP Geolocation (Approximate)
 * 4. Puerto Madero Center preset
 */
export async function acquireBestLocation(): Promise<LocationResult> {
  const timestamp = new Date().toISOString();

  // Try real GPS first
  try {
    const gpsRes = await requestRealDeviceGps(20000);
    return gpsRes;
  } catch (gpsError: unknown) {
    console.warn('High accuracy GPS error:', gpsError);

    // Try standard GPS (uses cell tower / wifi triangulation)
    try {
      const lowAccResult = await new Promise<LocationResult>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const { latitude, longitude, accuracy } = pos.coords;
            const label = await reverseGeocode(latitude, longitude);
            resolve({
              lat: latitude,
              lng: longitude,
              accuracy,
              source: 'gps',
              label: label || 'GPS aproximado celular',
              timestamp,
            });
          },
          (err) => reject(err),
          { enableHighAccuracy: false, timeout: 10000, maximumAge: 30000 }
        );
      });
      return lowAccResult;
    } catch {
      // Try IP Geolocation API fallback
      const ipResult = await fetchIpGeolocation();
      if (ipResult) {
        return {
          lat: ipResult.lat,
          lng: ipResult.lng,
          source: 'ip_api',
          label: ipResult.label,
          timestamp,
        };
      }

      // If all fails, rethrow clear message
      throw new Error(
        'No se pudo acceder al GPS de tu celular. Activa la Ubicación en los ajustes de tu teléfono y permite el acceso en el navegador.'
      );
    }
  }
}

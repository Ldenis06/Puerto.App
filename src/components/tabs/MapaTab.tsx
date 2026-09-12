import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { User, ProximityAlert } from '../../types';
import { calculateDistanceMeters } from '../../services/storage';
import {
  requestRealDeviceGps,
  PUERTO_MADERO_LANDMARKS,
  reverseGeocode,
} from '../../services/locationApi';
import {
  Compass,
  Crosshair,
  Heart,
  Flame,
  Layers,
  MapPin,
  Navigation,
  Radio,
  Users,
  Zap,
  AlertTriangle,
  LocateFixed,
  RefreshCw,
} from 'lucide-react';

interface Props {
  currentUser: User | null;
  users: User[];
  alerts: ProximityAlert[];
  onUpdateUserLocation: (
    userId: string,
    lat: number,
    lng: number,
    isActive: boolean,
    label?: string
  ) => void;
}

type MapLayerType = 'dark' | 'satellite' | 'street';

const TILE_LAYERS: Record<MapLayerType, { name: string; url: string; attribution: string }> = {
  dark: {
    name: 'Oscuro',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; CARTO &copy; OpenStreetMap',
  },
  satellite: {
    name: 'Satélite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri',
  },
  street: {
    name: 'Calles',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
  },
};

export const MapaTab: React.FC<Props> = ({
  currentUser,
  users,
  alerts,
  onUpdateUserLocation,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);
  const coupleLinesGroupRef = useRef<L.LayerGroup | null>(null);

  const [activeLayer, setActiveLayer] = useState<MapLayerType>('satellite');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [gpsStatusInfo, setGpsStatusInfo] = useState<string | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [locationSource, setLocationSource] = useState<'gps' | 'ip_api' | 'manual' | 'preset' | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [followUser, setFollowUser] = useState(true);

  const watchIdRef = useRef<number | null>(null);

  const isCurrentGpsActive = Boolean(currentUser?.location?.isActive);

  // Filter users who are currently sharing their live location
  const activeUsers = useMemo(() => {
    return users.filter((u) => u.location && u.location.isActive);
  }, [users]);

  // Detect which active users are within <= 50m of each other ("relación amorosa")
  const couplePairs = useMemo(() => {
    const pairs: { u1: User; u2: User; distance: number }[] = [];
    for (let i = 0; i < activeUsers.length; i++) {
      for (let j = i + 1; j < activeUsers.length; j++) {
        const u1 = activeUsers[i];
        const u2 = activeUsers[j];
        if (!u1.location || !u2.location) continue;
        const d = calculateDistanceMeters(
          u1.location.lat,
          u1.location.lng,
          u2.location.lat,
          u2.location.lng
        );
        if (d <= 50) {
          pairs.push({ u1, u2, distance: Math.round(d) });
        }
      }
    }
    return pairs;
  }, [activeUsers]);

  // Set of user IDs that are currently in a close couple (<= 50m)
  const coupleUserIds = useMemo(() => {
    const set = new Set<string>();
    couplePairs.forEach((pair) => {
      set.add(pair.u1.id);
      set.add(pair.u2.id);
    });
    return set;
  }, [couplePairs]);

  // 1. Initialize Leaflet Map (runs once)
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Use current user's location if already active, otherwise Puerto Madero
    const initialLat = currentUser?.location?.isActive ? currentUser.location.lat : -34.6083;
    const initialLng = currentUser?.location?.isActive ? currentUser.location.lng : -58.3644;
    const initialZoom = currentUser?.location?.isActive ? 17 : 16;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: initialZoom,
      zoomControl: false,
      attributionControl: false,
    });

    // Add Tile Layer
    const layerConfig = TILE_LAYERS[activeLayer];
    const tileLayer = L.tileLayer(layerConfig.url, {
      attribution: layerConfig.attribution,
      maxZoom: 19,
      subdomains: activeLayer === 'dark' ? 'abcd' : 'abc',
    }).addTo(map);

    tileLayerRef.current = tileLayer;

    // Add custom zoom control
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Layer groups
    const coupleLinesGroup = L.layerGroup().addTo(map);
    const markersGroup = L.layerGroup().addTo(map);

    markersGroupRef.current = markersGroup;
    coupleLinesGroupRef.current = coupleLinesGroup;
    mapInstanceRef.current = map;

    // Invalidate size on mount
    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // 2. Change Tile Layer when activeLayer changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const layerConfig = TILE_LAYERS[activeLayer];
    const newLayer = L.tileLayer(layerConfig.url, {
      attribution: layerConfig.attribution,
      maxZoom: 19,
      subdomains: activeLayer === 'dark' ? 'abcd' : 'abc',
    }).addTo(map);

    tileLayerRef.current = newLayer;
  }, [activeLayer]);

  // 3. Update User Markers & Relationship Lines
  useEffect(() => {
    if (!markersGroupRef.current || !coupleLinesGroupRef.current || !mapInstanceRef.current) return;

    const markersGroup = markersGroupRef.current;
    const coupleLinesGroup = coupleLinesGroupRef.current;

    markersGroup.clearLayers();
    coupleLinesGroup.clearLayers();

    // Draw love connection lines and 50m halos for couples
    couplePairs.forEach((pair) => {
      if (!pair.u1.location || !pair.u2.location) return;

      const p1: [number, number] = [pair.u1.location.lat, pair.u1.location.lng];
      const p2: [number, number] = [pair.u2.location.lat, pair.u2.location.lng];

      // Romantic connecting line
      L.polyline([p1, p2], {
        color: '#FF375F',
        weight: 3.5,
        opacity: 0.9,
        dashArray: '6, 8',
      }).addTo(coupleLinesGroup);

      // Translucent proximity bubble around both users
      L.circle(p1, {
        radius: 25,
        color: '#FF375F',
        weight: 1,
        fillColor: '#FF375F',
        fillOpacity: 0.18,
      }).addTo(coupleLinesGroup);

      L.circle(p2, {
        radius: 25,
        color: '#FF375F',
        weight: 1,
        fillColor: '#FF375F',
        fillOpacity: 0.18,
      }).addTo(coupleLinesGroup);
    });

    // Render user markers
    activeUsers.forEach((u) => {
      if (!u.location) return;
      const isSelf = currentUser?.id === u.id;
      const isInCouple = coupleUserIds.has(u.id);

      // Custom HTML Marker Pin
      const iconHtml = `
        <div class="custom-user-marker" style="position:relative; display:flex; flex-direction:column; align-items:center; cursor:pointer;">
          ${
            isInCouple
              ? `<div style="position:absolute; top:2px; width:48px; height:48px; border-radius:9999px; background:rgba(255,55,95,0.45); animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>`
              : ''
          }
          <div style="position:relative; width:48px; height:48px; border-radius:9999px; padding:2px; ${
            isInCouple
              ? 'background:linear-gradient(135deg, #FF375F, #FF7597); box-shadow:0 0 18px rgba(255,55,95,0.85);'
              : isSelf
              ? 'background:linear-gradient(135deg, #0A84FF, #5AC8FA); box-shadow:0 0 16px rgba(10,132,255,0.85);'
              : 'background:linear-gradient(135deg, #30D158, #34C759); box-shadow:0 0 10px rgba(48,209,88,0.7);'
          }">
            <img src="${u.avatarUrl}" alt="${u.name}" style="width:100%; height:100%; border-radius:9999px; object-fit:cover; background:#18181b; display:block;" />
            
            ${
              isInCouple
                ? `<div style="position:absolute; top:-5px; right:-5px; background:#FF375F; color:white; border-radius:9999px; width:20px; height:20px; font-size:11px; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 5px rgba(0,0,0,0.5);">❤️</div>`
                : isSelf
                ? `<div style="position:absolute; top:-5px; right:-5px; background:#0A84FF; color:white; border-radius:9999px; width:18px; height:18px; font-size:10px; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 4px rgba(0,0,0,0.5);">📍</div>`
                : ''
            }
            <span style="position:absolute; bottom:0px; right:0px; width:10px; height:10px; border-radius:9999px; background:#30D158; border:2px solid #000;"></span>
          </div>

          <div style="position:absolute; top:52px; left:50%; transform:translateX(-50%); padding:2px 8px; border-radius:6px; font-size:10px; font-weight:800; white-space:nowrap; ${
            isInCouple
              ? 'background:rgba(80,7,36,0.95); border:1px solid #FF375F; color:#FECDD3;'
              : isSelf
              ? 'background:rgba(10,132,255,0.95); border:1px solid #5AC8FA; color:#FFFFFF;'
              : 'background:rgba(0,0,0,0.85); border:1px solid rgba(255,255,255,0.2); color:#FFFFFF;'
          }">
            ${u.name} ${isSelf ? '(Tú - Celular)' : ''}
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-map-user-pin',
        html: iconHtml,
        iconSize: [52, 70],
        iconAnchor: [26, 26],
      });

      const marker = L.marker([u.location.lat, u.location.lng], { icon: customIcon });

      // Popup details
      let popupContent = `
        <div style="padding:4px; font-family:sans-serif; color:#18181b; min-width:180px;">
          <div style="display:flex; align-items:center; gap:8px; border-bottom:1px solid #e4e4e7; padding-bottom:6px;">
            <img src="${u.avatarUrl}" alt="${u.name}" style="width:34px; height:34px; border-radius:9999px; object-fit:cover;" />
            <div>
              <div style="font-weight:bold; font-size:13px; color:#09090b;">${u.name} ${isSelf ? '(Tu celular)' : ''}</div>
              <div style="font-size:10px; color:#71717a;">${u.location.label || 'Ubicación en vivo'}</div>
            </div>
          </div>
      `;

      if (isInCouple) {
        popupContent += `
          <div style="margin-top:6px; padding:4px 8px; border-radius:6px; background:#FFE4E6; border:1px solid #FDA4AF; color:#9F1239; font-size:11px; font-weight:bold; display:flex; align-items:center; gap:4px;">
            <span>❤️</span> ¡Relación amorosa detectada!
          </div>
        `;
      }

      if (currentUser && currentUser.location?.isActive && currentUser.id !== u.id) {
        const dist = Math.round(
          calculateDistanceMeters(
            currentUser.location.lat,
            currentUser.location.lng,
            u.location.lat,
            u.location.lng
          )
        );
        popupContent += `
          <div style="margin-top:6px; font-size:11px; color:#3f3f46;">
            Distancia a ti: <strong style="color:#09090b;">${dist > 1000 ? (dist / 1000).toFixed(1) + ' km' : dist + ' metros'}</strong>
          </div>
        `;
      }

      popupContent += `
          <div style="margin-top:4px; font-size:9px; color:#a1a1aa; font-family:monospace;">
            ${u.location.lat.toFixed(5)}, ${u.location.lng.toFixed(5)}
          </div>
        </div>
      `;

      marker.bindPopup(popupContent);
      marker.on('click', () => {
        setSelectedUserId(u.id);
      });

      marker.addTo(markersGroup);
    });
  }, [activeUsers, couplePairs, coupleUserIds, currentUser, gpsAccuracy]);

  // Cleanup watchPosition on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null && 'geolocation' in navigator) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, []);

  // Primary function: Request cell phone GPS with live continuous tracking
  const handleRequestCellPhoneGps = async (showErrors = true) => {
    if (!currentUser) return;

    setIsLocating(true);
    setGpsError(null);
    setGpsStatusInfo('Solicitando permiso para compartir tu ubicación. Solo se activará si aceptás en tu celular.');

    try {
      // Direct call to device GPS (gives user 25 seconds to tap Allow)
      const result = await requestRealDeviceGps(25000);
      setIsLocating(false);
      setLocationSource(result.source);
      setGpsAccuracy(result.accuracy || 15);
      setGpsStatusInfo(`📍 Celular localizado en vivo: ${result.label} (±${Math.round(result.accuracy || 10)}m)`);

      onUpdateUserLocation(currentUser.id, result.lat, result.lng, true, result.label);

      // Center map on user's real phone location with high zoom
      if (mapInstanceRef.current) {
        mapInstanceRef.current.flyTo([result.lat, result.lng], 17, { duration: 1.2 });
      }

      // Start continuous watchPosition so as the phone moves, the marker updates live!
      if ('geolocation' in navigator) {
        if (watchIdRef.current !== null) {
          navigator.geolocation.clearWatch(watchIdRef.current);
        }

        watchIdRef.current = navigator.geolocation.watchPosition(
          async (pos) => {
            const { latitude, longitude, accuracy } = pos.coords;
            setGpsAccuracy(accuracy);
            const freshLabel = await reverseGeocode(latitude, longitude);
            onUpdateUserLocation(currentUser.id, latitude, longitude, true, freshLabel);

            // If follow mode is enabled, keep centering
            if (followUser && mapInstanceRef.current) {
              mapInstanceRef.current.panTo([latitude, longitude]);
            }
          },
          (err) => {
            console.warn('Live watch error:', err);
          },
          { enableHighAccuracy: true, maximumAge: 2000, timeout: 20000 }
        );
      }
    } catch (err: unknown) {
      setIsLocating(false);
      const message = err instanceof Error ? err.message : 'No se pudo obtener la ubicación del celular';
      if (showErrors) {
        setGpsError(message);
        setGpsStatusInfo(null);
      } else {
        // Soft fallback for initial auto-detect without aggressive error modal
        console.warn('Initial soft auto-detect failed:', message);
      }
    }
  };

  // Toggle GPS on/off
  const handleToggleMyGps = () => {
    if (!currentUser) return;

    if (isCurrentGpsActive) {
      if (watchIdRef.current !== null && 'geolocation' in navigator) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      onUpdateUserLocation(
        currentUser.id,
        currentUser.location?.lat || -34.6083,
        currentUser.location?.lng || -58.3644,
        false,
        'Ubicación pausada'
      );
      setGpsStatusInfo(null);
      setLocationSource(null);
      setGpsAccuracy(null);
    } else {
      handleRequestCellPhoneGps(true);
    }
  };

  // Center on current user's phone location
  const handleFocusMe = () => {
    if (currentUser?.location?.isActive && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(
        [currentUser.location.lat, currentUser.location.lng],
        18,
        { duration: 1 }
      );
    } else {
      handleRequestCellPhoneGps(true);
    }
  };

  // Center on Puerto Madero
  const handleRecenterPuertoMadero = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([-34.6083, -58.3644], 16, { duration: 1 });
    }
  };

  // Center on a couple having a love relationship
  const handleFocusCouple = (pair: { u1: User; u2: User }) => {
    if (pair.u1.location && pair.u2.location && mapInstanceRef.current) {
      const centerLat = (pair.u1.location.lat + pair.u2.location.lat) / 2;
      const centerLng = (pair.u1.location.lng + pair.u2.location.lng) / 2;
      mapInstanceRef.current.flyTo([centerLat, centerLng], 18, { duration: 1.2 });
      setSelectedUserId(pair.u1.id);
    }
  };

  return (
    <div className="space-y-4 pb-24 animate-fadeIn">
      {/* Primary Mobile Location Card */}
      <div className="p-4 rounded-[26px] bg-gradient-to-br from-[#0A84FF]/15 via-blue-950/30 to-purple-950/20 border-2 border-[#0A84FF]/40 backdrop-blur-xl shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-2xl bg-[#0A84FF]/20 border border-[#0A84FF]/40 text-[#5AC8FA] shrink-0">
              <LocateFixed className={`w-6 h-6 ${isLocating ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                <span>Ubicación en Vivo de tu Celular</span>
                {isCurrentGpsActive && (
                  <span className="flex items-center gap-1 text-[10px] bg-[#30D158]/20 text-[#30D158] border border-[#30D158]/30 px-2 py-0.5 rounded-full font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#30D158] animate-ping" />
                    GPS EN VIVO
                  </span>
                )}
              </h2>
              <p className="text-xs text-zinc-300 mt-0.5">
                {currentUser?.location?.isActive
                  ? `${currentUser.location.label || 'Transmitiendo tus coordenadas satelitales'}`
                  : 'Elegí compartir para que el navegador solicite tu permiso. Podés pausarlo cuando quieras.'}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              id="btn-get-my-phone-gps"
              type="button"
              onClick={() => handleRequestCellPhoneGps(true)}
              disabled={isLocating}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#0A84FF] to-[#5AC8FA] hover:brightness-110 text-white text-xs font-black shadow-[0_0_20px_rgba(10,132,255,0.4)] active:scale-95 transition"
            >
              <RefreshCw className={`w-4 h-4 ${isLocating ? 'animate-spin' : ''}`} />
              <span>{isLocating ? 'Detectando GPS...' : '📍 Compartir mi ubicación'}</span>
            </button>

            {isCurrentGpsActive && (
              <button
                type="button"
                onClick={handleToggleMyGps}
                className="p-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 text-xs font-bold active:scale-95 transition"
                title="Pausar GPS"
              >
                Pausar
              </button>
            )}
          </div>
        </div>

        {/* GPS Status / Guidance Banner */}
        {gpsStatusInfo && (
          <div className="mt-3 p-3 rounded-2xl bg-black/40 border border-white/10 text-xs text-[#5AC8FA] flex items-center justify-between gap-2 animate-fadeIn">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 shrink-0 text-[#30D158] animate-pulse" />
              <span className="font-medium text-white">{gpsStatusInfo}</span>
            </div>
            {gpsAccuracy && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-200 border border-blue-400/30 font-bold shrink-0">
                ±{Math.round(gpsAccuracy)} metros
              </span>
            )}
          </div>
        )}

        {!isCurrentGpsActive && !gpsStatusInfo && !gpsError && (
          <p className="mt-3 text-[11px] leading-relaxed text-zinc-400">
            La ubicación se obtiene únicamente desde el GPS del dispositivo después de tu autorización. Esta versión guarda los datos en este navegador; para ver la posición de otros celulares en tiempo real hace falta conectar una base de datos compartida.
          </p>
        )}

        {/* GPS Permission Error or Warning Box */}
        {gpsError && (
          <div className="mt-3 p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-xs text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 animate-fadeIn">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-amber-300">Aviso de Ubicación:</div>
                <div className="text-zinc-300 mt-0.5">{gpsError}</div>
                <div className="text-[11px] text-zinc-400 mt-1">
                  Tip: En Chrome/Safari tocá el candado o ícono de ajustes al lado del link arriba y marcá <strong>"Permitir ubicación"</strong>.
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleRequestCellPhoneGps(true)}
              className="self-end sm:self-center px-3 py-1.5 rounded-lg bg-amber-500 text-black font-bold text-xs shrink-0"
            >
              Reintentar
            </button>
          </div>
        )}
      </div>

      {/* Love Relationship Alert Banners (Relación Amorosa ≤ 50m) */}
      {couplePairs.length > 0 && (
        <div className="space-y-2">
          {couplePairs.map((pair, idx) => (
            <div
              key={`couple-${pair.u1.id}-${pair.u2.id}-${idx}`}
              className="p-4 rounded-[24px] bg-gradient-to-r from-pink-900/50 via-rose-950/70 to-purple-900/50 border-2 border-pink-500 shadow-[0_0_30px_rgba(255,55,95,0.4)] backdrop-blur-xl animate-scaleUp text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                {/* Overlapping Avatars with glowing heart badge */}
                <div className="relative flex items-center shrink-0">
                  <img
                    src={pair.u1.avatarUrl}
                    alt={pair.u1.name}
                    className="w-11 h-11 rounded-full object-cover border-2 border-pink-400 bg-zinc-900 shadow-md"
                  />
                  <img
                    src={pair.u2.avatarUrl}
                    alt={pair.u2.name}
                    className="w-11 h-11 rounded-full object-cover border-2 border-pink-400 bg-zinc-900 -ml-4 shadow-md"
                  />
                  <div className="absolute -bottom-1 left-5 w-6 h-6 rounded-full bg-gradient-to-tr from-pink-600 to-rose-500 flex items-center justify-center shadow-lg animate-bounce">
                    <Heart className="w-3.5 h-3.5 fill-white text-white" />
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-1.5 text-xs font-black tracking-wide text-pink-300 uppercase">
                    <Flame className="w-3.5 h-3.5 text-[#FF375F] animate-pulse" />
                    <span>¡Alerta en Vivo: Relación Amorosa Detectada!</span>
                  </div>
                  <div className="text-sm font-extrabold text-white mt-0.5">
                    {pair.u1.name} y {pair.u2.name} están teniendo relaciones amorosas.
                  </div>
                  <div className="text-[11px] text-pink-200/90 mt-0.5 flex items-center gap-2">
                    <span>Están juntos a <strong>{pair.distance} metros</strong></span>
                    <span>•</span>
                    <span>Geocerca activa ≤ 50m</span>
                  </div>
                </div>
              </div>

              {/* Quick Focus Button */}
              <button
                type="button"
                onClick={() => handleFocusCouple(pair)}
                className="self-end sm:self-center px-3.5 py-2 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-xs font-bold transition active:scale-95 shadow-md flex items-center gap-1.5 shrink-0"
              >
                <Heart className="w-3.5 h-3.5 fill-current" />
                <span>Ver en el mapa</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Interactive Map Container */}
      <div className="relative w-full h-[440px] rounded-[26px] overflow-hidden border border-white/15 shadow-2xl bg-zinc-950">
        <div
          id="puerto-madero-leaflet-map"
          ref={mapContainerRef}
          className="w-full h-full z-0"
        />

        {/* Floating Controls: Focus Me, Recenter & Layer Switcher */}
        <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-2">
          <button
            id="btn-focus-me-gps"
            type="button"
            onClick={handleFocusMe}
            className="p-2.5 rounded-xl bg-black/85 hover:bg-black text-white border border-[#0A84FF]/50 backdrop-blur-md shadow-[0_0_15px_rgba(10,132,255,0.4)] active:scale-95 transition flex items-center gap-1"
            title="Centrar en mi Celular"
          >
            <Crosshair className="w-5 h-5 text-[#0A84FF] animate-pulse" />
          </button>

          <button
            id="btn-recenter-puerto-madero"
            type="button"
            onClick={handleRecenterPuertoMadero}
            className="p-2.5 rounded-xl bg-black/80 hover:bg-black text-white border border-white/20 backdrop-blur-md shadow-lg active:scale-95 transition"
            title="Ver Puerto Madero"
          >
            <Navigation className="w-4 h-4 text-[#5AC8FA]" />
          </button>

          {/* Map Layer Switcher */}
          <div className="p-1 rounded-xl bg-black/80 border border-white/20 backdrop-blur-md shadow-lg flex flex-col gap-1">
            {(['dark', 'satellite', 'street'] as MapLayerType[]).map((layer) => (
              <button
                key={layer}
                type="button"
                onClick={() => setActiveLayer(layer)}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold transition ${
                  activeLayer === layer
                    ? 'bg-white/25 text-white'
                    : 'text-zinc-400 hover:text-white'
                }`}
                title={`Vista ${TILE_LAYERS[layer].name}`}
              >
                {TILE_LAYERS[layer].name}
              </button>
            ))}
          </div>
        </div>

        {/* Map Legend & Hint Overlay */}
        <div className="absolute bottom-3 left-3 z-[1000] flex flex-col sm:flex-row items-start sm:items-center gap-2 pointer-events-none">
          <div className="px-3 py-1.5 rounded-xl bg-black/85 border border-white/15 backdrop-blur-md text-[10px] text-zinc-300 flex items-center gap-2 shadow-lg">
            <span className="w-2 h-2 rounded-full bg-[#0A84FF]" />
            <span>Tu foto = tu ubicación</span>
            <span className="text-zinc-500">•</span>
            <span className="text-pink-400">❤️ = Relación amorosa (≤50m)</span>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-xs text-zinc-300">
        <span className="mr-2 rounded-full border border-[#5AC8FA]/40 bg-[#0A84FF]/15 px-2 py-1 font-bold text-[#5AC8FA]">Próximamente</span>
        Alertas grupales automáticas por cercanía y ubicación compartida mediante servidor en segundo plano.
      </div>

      {/* Puerto Madero Landmarks */}
      <div className="p-4 rounded-[26px] bg-white/[0.04] border border-white/10 backdrop-blur-xl">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-[#5AC8FA]" />
            <span>Puntos de Puerto Madero</span>
          </div>
          <span className="text-[10px] text-zinc-500">Toca para ir</span>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {PUERTO_MADERO_LANDMARKS.map((lm) => (
            <button
              key={lm.id}
              type="button"
              onClick={() => {
                if (mapInstanceRef.current) {
                  mapInstanceRef.current.flyTo([lm.lat, lm.lng], 17, { duration: 1 });
                }
              }}
              className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-left transition shrink-0 active:scale-95 flex items-center gap-2"
            >
              <div className="w-2 h-2 rounded-full bg-[#0A84FF]" />
              <div>
                <div className="text-xs font-semibold text-white whitespace-nowrap">{lm.name}</div>
                <div className="text-[10px] text-zinc-400 whitespace-nowrap">{lm.description.split(' - ')[0]}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Active Member Status List */}
      <div className="p-4 rounded-[26px] bg-white/[0.04] border border-white/10 backdrop-blur-xl">
        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-[#0A84FF]" />
          <span>Integrantes del Grupo ({activeUsers.length}/6 transmitiendo)</span>
        </h3>

        <div className="space-y-2">
          {users.map((u) => {
            const loc = u.location;
            const isActive = loc?.isActive;
            const isSelf = currentUser?.id === u.id;
            const isInCouple = coupleUserIds.has(u.id);

            // Compute distance to current user
            let distText = '';
            if (currentUser?.location?.isActive && loc?.isActive && !isSelf) {
              const d = Math.round(
                calculateDistanceMeters(
                  currentUser.location.lat,
                  currentUser.location.lng,
                  loc.lat,
                  loc.lng
                )
              );
              distText = d > 1000 ? `${(d / 1000).toFixed(1)} km de ti` : `${d} m de ti`;
            }

            return (
              <div
                key={u.id}
                onClick={() => {
                  if (isActive && loc && mapInstanceRef.current) {
                    mapInstanceRef.current.flyTo([loc.lat, loc.lng], 17, { duration: 1 });
                    setSelectedUserId(u.id);
                  }
                }}
                className={`flex items-center justify-between p-2.5 rounded-xl border transition ${
                  isActive
                    ? 'bg-white/5 hover:bg-white/10 border-white/10 cursor-pointer'
                    : 'bg-white/[0.02] border-white/5 opacity-70'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="relative">
                    <img
                      src={u.avatarUrl}
                      alt={u.name}
                      className="w-8 h-8 rounded-full object-cover bg-zinc-900 border border-white/10"
                    />
                    {isInCouple && (
                      <span className="absolute -top-1 -right-1 text-[10px]">❤️</span>
                    )}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                      <span>{u.name}</span>
                      {isSelf && <span className="text-[9px] text-[#5AC8FA] font-bold">(Tu celular)</span>}
                      {isInCouple && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-pink-500/20 text-pink-400 font-bold border border-pink-500/30">
                          En pareja ❤️
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-zinc-400 flex items-center gap-2">
                      <span>{isActive ? loc?.label || 'GPS en vivo' : 'Offline'}</span>
                      {distText && (
                        <>
                          <span>•</span>
                          <span className="text-zinc-300 font-medium">{distText}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`inline-block w-2 h-2 rounded-full ${
                      isActive ? 'bg-[#30D158] shadow-[0_0_8px_#30D158]' : 'bg-zinc-600'
                    }`}
                  />
                  <span className="text-[11px] font-medium text-zinc-300">
                    {isActive ? 'En Vivo' : 'Offline'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

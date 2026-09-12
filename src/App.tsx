import React, { useCallback, useEffect, useState } from 'react';
import { Expense, ProximityAlert, RouletteResult, User } from './types';
import {
  checkBirthdays,
  evaluateProximityAlerts,
  getCurrentUser,
  getStoredExpenses,
  getStoredRoulette,
  getStoredUsers,
  saveStoredExpenses,
  clearStoredExpenses,
  saveStoredRoulette,
  saveStoredUsers,
  setCurrentUser,
  canChangeProfileOnce,
  consumeProfileChangeOnce,
  isLocationSharingEnabled,
  setLocationSharingEnabled,
} from './services/storage';
import { Header } from './components/Header';
import { TabBar, TabType } from './components/TabBar';
import { RuletaTab } from './components/tabs/RuletaTab';
import { MapaTab } from './components/tabs/MapaTab';
import { GastosTab } from './components/tabs/GastosTab';
import { PerfilTab } from './components/tabs/PerfilTab';
import { SalidasTab } from './components/tabs/SalidasTab';
import { LibretasTab } from './components/tabs/LibretasTab';
import { NameLoginGate } from './components/NameLoginGate';
import { MemberProfileModal } from './components/MemberProfileModal';
import { NotificationsModal } from './components/NotificationsModal';
import { SplashScreen } from './components/SplashScreen';
import { getSharedProfileAvatars, getSharedProfileDescriptions, saveSharedProfileAvatar, saveSharedProfileDescription } from './services/supabase';
import confetti from 'canvas-confetti';

const DENIS_PASSWORD_DIGEST = 'a00fce1d15fb5583cdd36bdfc3fd3a2fec84b3d43abeff1bb4f95a1a557f0e51';

async function sha256(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function localAvatar(name: string, url: string) {
  // Keep real uploaded images (JPEG/PNG/WebP). Earlier app versions stored
  // generated SVG fallbacks in localStorage, so regenerate those consistently.
  if (typeof url === 'string' && !url.includes('api.dicebear.com') && !url.startsWith('data:image/svg+xml')) return url;
  const safeName = typeof name === 'string' && name.trim() ? name : 'Usuario';
  const variants = [
    ['#0A84FF', 'M14 42Q14 18 28 28Q40 10 52 28Q66 18 66 42Q66 66 40 68Q14 66 14 42', '18', '62'],
    ['#30D158', 'M12 42Q12 16 40 16Q68 16 68 42Q68 68 40 68Q12 68 12 42', '40', '40'],
    ['#FF9500', 'M16 62Q8 28 24 26L20 12L34 24Q40 18 46 24L60 12L56 26Q72 28 64 62Z', '27', '53'],
    ['#BF5AF2', 'M12 52Q12 18 40 18Q68 18 68 52Q62 70 40 68Q18 70 12 52', '25', '55'],
    ['#FFD60A', 'M16 20H64V64H16Z', '28', '52'],
    ['#FF375F', 'M10 46Q16 20 40 18Q64 20 70 46Q62 70 40 68Q18 70 10 46', '24', '56'],
  ];
  const [color, body, leftEye, rightEye] = variants[[...safeName].reduce((total, char) => total + char.charCodeAt(0), 0) % variants.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><rect width="80" height="80" rx="40" fill="#111827"/><path d="${body}" fill="${color}" stroke="#fff" stroke-width="2"/><circle cx="${leftEye}" cy="38" r="7" fill="#fff"/><circle cx="${rightEye}" cy="38" r="7" fill="#fff"/><circle cx="${leftEye}" cy="39" r="3" fill="#111827"/><circle cx="${rightEye}" cy="39" r="3" fill="#111827"/><path d="M30 54Q40 61 50 54" fill="none" stroke="#111827" stroke-width="3" stroke-linecap="round"/></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export default function App() {
  const [users, setUsers] = useState<User[]>(() => getStoredUsers().map((member) => ({ ...member, avatarUrl: localAvatar(member.name, member.avatarUrl) })));
  const [user, setUser] = useState<User | null>(() => {
    const stored = getCurrentUser();
    return stored ? { ...stored, avatarUrl: localAvatar(stored.name, stored.avatarUrl) } : null;
  });
  const [activeTab, setActiveTab] = useState<TabType>('ruleta');
  const [expenses, setExpenses] = useState<Expense[]>(() => getStoredExpenses());
  const [rouletteHistory, setRouletteHistory] = useState<RouletteResult | null>(() => getStoredRoulette());
  const finishSplash = useCallback(() => setShowSplash(false), []);

  // Remote avatar providers can be blocked by a device, DNS filter, or offline mode.
  // Keep every profile identifiable by replacing only failed images with a local SVG.
  useEffect(() => {
    const handleImageError = (event: Event) => {
      const image = event.target;
      if (!(image instanceof HTMLImageElement) || image.dataset.avatarFallback === 'true') return;
      image.dataset.avatarFallback = 'true';
      const label = image.alt?.trim() || 'Usuario';
      const initials = label.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><rect width="80" height="80" rx="40" fill="#0A84FF"/><text x="40" y="49" text-anchor="middle" font-family="Arial,sans-serif" font-size="28" font-weight="700" fill="white">${initials}</text></svg>`;
      image.src = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
    };
    document.addEventListener('error', handleImageError, true);
    return () => document.removeEventListener('error', handleImageError, true);
  }, []);

  // Profile photos used to live only in localStorage, so other devices could
  // only display the default avatar. Pull the group copy at startup, on focus,
  // and periodically while the app remains open.
  useEffect(() => {
    let disposed = false;
    const syncAvatars = async () => {
      try {
        const shared = await getSharedProfileAvatars();
        if (disposed || shared.length === 0) return;
        const byUserId = new Map(shared.map((avatar) => [avatar.user_id, avatar.avatar_data]));
        setUsers((current) => {
          const next = current.map((member) => {
            const avatarUrl = byUserId.get(member.id);
            return avatarUrl ? { ...member, avatarUrl } : member;
          });
          saveStoredUsers(next);
          return next;
        });
        setUser((current) => {
          const avatarUrl = current ? byUserId.get(current.id) : undefined;
          return current && avatarUrl ? { ...current, avatarUrl } : current;
        });
      } catch {
        // Offline use keeps the last locally saved avatar and retries later.
      }
    };
    const onFocus = () => void syncAvatars();
    void syncAvatars();
    window.addEventListener('focus', onFocus);
    const timer = window.setInterval(() => void syncAvatars(), 30000);
    return () => { disposed = true; window.removeEventListener('focus', onFocus); window.clearInterval(timer); };
  }, [user?.id]);

  useEffect(() => {
    let disposed = false;
    const syncDescriptions = async () => {
      try {
        const shared = await getSharedProfileDescriptions();
        if (disposed || shared.length === 0) return;
        const byUserId = new Map(shared.map((item) => [item.user_id, item.description]));
        setUsers((current) => {
          const next = current.map((member) => {
            const aiDescription = byUserId.get(member.id);
            return aiDescription ? { ...member, aiDescription } : member;
          });
          saveStoredUsers(next);
          return next;
        });
        setUser((current) => {
          const aiDescription = current ? byUserId.get(current.id) : undefined;
          return current && aiDescription ? { ...current, aiDescription } : current;
        });
      } catch {
        // Offline use preserves descriptions already saved on this device.
      }
    };
    const onFocus = () => void syncDescriptions();
    void syncDescriptions();
    window.addEventListener('focus', onFocus);
    const timer = window.setInterval(() => void syncDescriptions(), 30000);
    return () => { disposed = true; window.removeEventListener('focus', onFocus); window.clearInterval(timer); };
  }, [user?.id]);
  // Modals & UI states
  const [showSplash, setShowSplash] = useState(true);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [inspectedMember, setInspectedMember] = useState<User | null>(null);

  // Birthday simulation state
  const [simulatedDate, setSimulatedDate] = useState<{ day: number; month: number } | null>(null);

  // Evaluated Proximity Alerts
  const [proximityAlerts, setProximityAlerts] = useState<ProximityAlert[]>([]);

  // This watcher belongs to the app, not the map tab. Once a user explicitly
  // opted in, it continues while Puerto App is open even if they navigate away
  // from the map. Browsers/operating systems may still pause closed background
  // tabs; a native app is required to request true background location.
  useEffect(() => {
    if (!user || !isLocationSharingEnabled(user.id) || !('geolocation' in navigator)) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          isActive: true,
          lastUpdated: new Date().toISOString(),
          label: 'GPS compartido en vivo',
        };
        setUsers((current) => {
          const next = current.map((member) => member.id === user.id ? { ...member, location } : member);
          saveStoredUsers(next);
          return next;
        });
        setUser((current) => current?.id === user.id ? { ...current, location } : current);
      },
      () => {
        // Keep the explicit opt-in so the user can retry from the map without
        // silently changing their privacy preference.
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 20000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [user?.id]);

  // Birthday Greeting
  const birthdayInfo = checkBirthdays(users, user, simulatedDate || undefined);

  // Trigger confetti if current user is celebrant
  useEffect(() => {
    if (birthdayInfo && birthdayInfo.isCelebrant) {
      confetti({
        particleCount: 100,
        spread: 90,
        origin: { y: 0.5 },
        colors: ['#FF9500', '#FF375F', '#0A84FF', '#FFD60A'],
      });
    }
  }, [birthdayInfo?.isCelebrant, birthdayInfo?.todayFormatted]);

  // Evaluate proximity alerts whenever user locations change
  useEffect(() => {
    const alerts = evaluateProximityAlerts(users);
    setProximityAlerts(alerts);
  }, [users]);

  // Find member whose birthday is today (for carousel badge)
  const todayBirthdayMember = users.find((u) => {
    const today = new Date();
    const day = simulatedDate ? simulatedDate.day : today.getDate();
    const month = simulatedDate ? simulatedDate.month : today.getMonth() + 1;
    const formatted = `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}`;
    return u.birthday === formatted;
  });

  // Calculate pending debt count for user's tab badge
  const pendingDebtCount = expenses.filter(
    (exp) => !exp.isPaid && user && exp.payerId !== user.id && exp.participantIds.includes(user.id)
  ).length;

  // Handlers for session
  const handleLogin = async (newUser: User, password?: string): Promise<boolean> => {
    if (newUser.id === 'denis' && await sha256(password || '') !== DENIS_PASSWORD_DIGEST) return false;
    const current = users.find((member) => member.id === newUser.id) || newUser;
    setUser(current);
    setCurrentUser(current.id);
    return true;
  };

  // Handlers for users update
  const handleUpdateUser = (updatedUser: User): boolean => {
    const nextUsers = users.map((u) => (u.id === updatedUser.id ? updatedUser : u));
    setUsers(nextUsers);
    saveStoredUsers(nextUsers);

    if (user?.id === updatedUser.id) {
      setUser(updatedUser);
    }
    if (inspectedMember?.id === updatedUser.id) {
      setInspectedMember(updatedUser);
    }
    return true;
  };

  // Geolocation update for a user
  const handleUpdateUserLocation = (
    userId: string,
    lat: number,
    lng: number,
    isActive: boolean,
    label?: string
  ) => {
    if (user?.id === userId) setLocationSharingEnabled(userId, isActive);
    const location = {
      lat,
      lng,
      isActive,
      lastUpdated: new Date().toISOString(),
      label,
    };
    const nextUsers = users.map((u) => {
      if (u.id === userId) {
        return {
          ...u,
          location: { ...location, label: label || u.location?.label },
        };
      }
      return u;
    });

    setUsers(nextUsers);
    saveStoredUsers(nextUsers);

    if (user?.id === userId) {
      setUser(nextUsers.find((u) => u.id === userId) || null);
    }
  };

  // Expenses management
  const handleAddExpense = (
    newExpData: Omit<Expense, 'id' | 'createdAt' | 'isPaid' | 'individualQuota'>
  ) => {
    const individualQuota = Math.round(newExpData.totalAmount / newExpData.participantIds.length);
    const newExpense: Expense = {
      ...newExpData,
      id: `exp-${Date.now()}`,
      createdAt: new Date().toISOString(),
      isPaid: false,
      individualQuota,
    };

    const nextExpenses = [newExpense, ...expenses];
    setExpenses(nextExpenses);
    saveStoredExpenses(nextExpenses);
  };

  const handleMarkAsPaid = (expenseId: string) => {
    const nextExpenses = expenses.map((exp) => {
      if (exp.id === expenseId) {
        return {
          ...exp,
          isPaid: true,
          paidAt: new Date().toISOString(),
        };
      }
      return exp;
    });

    setExpenses(nextExpenses);
    saveStoredExpenses(nextExpenses);
  };

  const handleUpdateAvatar = async (avatarUrl: string, password?: string): Promise<void> => {
    if (!user) throw new Error('Elegí un perfil antes de cambiar la foto.');
    const updatedUser = { ...user, avatarUrl };
    handleUpdateUser(updatedUser);
    await saveSharedProfileAvatar(updatedUser.id, avatarUrl, password);
  };

  const handleUpdateAiDescription = async (userId: string, aiDescription: string, password: string): Promise<void> => {
    const member = users.find((item) => item.id === userId);
    if (!member) throw new Error('No se encontró el perfil seleccionado.');
    const updatedUser = { ...member, aiDescription };
    await saveSharedProfileDescription(userId, aiDescription, password);
    handleUpdateUser(updatedUser);
  };

  const handleUseProfileChange = () => {
    consumeProfileChangeOnce();
    setUser(null);
  };

  const handleClearAllExpenses = () => {
    if (user?.id !== 'denis' || user.role !== 'admin') return;
    setExpenses([]);
    clearStoredExpenses();
  };

  const handleSaveRouletteResult = (res: RouletteResult) => {
    setRouletteHistory(res);
    saveStoredRoulette(res);
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col justify-between selection:bg-[#0A84FF] selection:text-white">
      {/* Splash Screen */}
      {showSplash && <SplashScreen onFinish={finishSplash} />}

      {/* Local profile selection when user is not logged in */}
      {!user && !showSplash && (
        <NameLoginGate
          users={users}
          onLogin={handleLogin}
        />
      )}

      {/* Main Container */}
      <div className="w-full flex-1 flex flex-col">
        {/* Sticky iOS Header */}
        <Header
          currentUser={user}
          users={users}
          alerts={proximityAlerts}
          onSelectMember={(member) => setInspectedMember(member)}
          onOpenNotifications={() => setShowNotificationsModal(true)}
          todayBirthdayMember={todayBirthdayMember}
        />

        {/* Private Birthday Alert Banner (if applicable for today) */}
        {birthdayInfo && (
          <div className="max-w-xl mx-auto w-full px-4 pt-3">
            <div
              className={`p-3.5 rounded-[22px] border backdrop-blur-xl flex items-center justify-between gap-3 shadow-lg ${
                birthdayInfo.isCelebrant
                  ? 'bg-gradient-to-r from-[#FF9500]/20 via-[#FF375F]/20 to-zinc-950 border-[#FF9500]/50'
                  : 'bg-gradient-to-r from-[#0A84FF]/20 via-[#5AC8FA]/15 to-zinc-950 border-[#0A84FF]/40'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-xl text-lg ${
                    birthdayInfo.isCelebrant ? 'bg-[#FF9500] text-black' : 'bg-[#0A84FF] text-white'
                  }`}
                >
                  🎂
                </div>
                <div>
                  <div className="text-xs font-black tracking-tight text-white flex items-center gap-1.5">
                    <span>{birthdayInfo.isCelebrant ? '¡FELIZ CUMPLEAÑOS!' : 'AVISO PRIVADO'}</span>
                    <span className="text-[10px] text-zinc-400 font-normal">({birthdayInfo.todayFormatted})</span>
                  </div>
                  <div className="text-xs text-zinc-200 mt-0.5">{birthdayInfo.message}</div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowNotificationsModal(true)}
                className="text-[10px] text-zinc-400 hover:text-white px-2 py-1 rounded-lg bg-white/10 shrink-0 font-semibold"
              >
                Ver
              </button>
            </div>
          </div>
        )}

        {/* Main Content Area based on Active Tab */}
        <main className="max-w-xl mx-auto w-full px-4 pt-3 flex-1">
          {activeTab === 'ruleta' && (
            <RuletaTab
              users={users}
              onSaveResult={handleSaveRouletteResult}
              initialResult={rouletteHistory}
            />
          )}

          {activeTab === 'mapa' && (
            <MapaTab
              currentUser={user}
              users={users}
              alerts={proximityAlerts}
              onUpdateUserLocation={handleUpdateUserLocation}
            />
          )}

          {activeTab === 'salidas' && <SalidasTab />}

          {activeTab === 'libretas' && <LibretasTab isDenis={user?.id === 'denis' && user.role === 'admin'} isUnavailable={user?.id === 'maxi'} />}

          {activeTab === 'gastos' && (
            <GastosTab
              currentUser={user}
              users={users}
              expenses={expenses}
              onAddExpense={handleAddExpense}
              onMarkAsPaid={handleMarkAsPaid}
              canManageExpenses={user?.id === 'denis' && user.role === 'admin'}
              onClearAllExpenses={handleClearAllExpenses}
            />
          )}

          {activeTab === 'perfil' && (
            <PerfilTab
              currentUser={user}
              users={users}
              onUpdateUser={handleUpdateUser}
              onUpdateAvatar={handleUpdateAvatar}
              onUpdateAiDescription={handleUpdateAiDescription}
              isAdmin={user?.id === 'denis' && user.role === 'admin'}
              onClearAllExpenses={handleClearAllExpenses}
              canChangeProfile={canChangeProfileOnce()}
              onUseProfileChange={handleUseProfileChange}
            />
          )}
        </main>

        {/* Fixed iOS Tab Bar */}
        <TabBar
          activeTab={activeTab}
          onChangeTab={(tab) => setActiveTab(tab)}
          pendingDebtCount={pendingDebtCount}
        />
      </div>


      {/* Inspected Member Profile Modal (Carousel tap) */}
      <MemberProfileModal
        member={inspectedMember}
        currentUser={user}
        expenses={expenses}
        onClose={() => setInspectedMember(null)}
      />

      {/* Notifications and Birthday Simulation Drawer */}
      <NotificationsModal
        isOpen={showNotificationsModal}
        onClose={() => setShowNotificationsModal(false)}
        alerts={proximityAlerts}
        birthdayAlert={birthdayInfo}
        users={users}
        onSimulateBirthday={(day, month) => setSimulatedDate({ day, month })}
        onResetBirthday={() => setSimulatedDate(null)}
        simulatedDate={simulatedDate}
      />
    </div>
  );
}

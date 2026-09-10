import React, { useCallback, useEffect, useState } from 'react';
import { collection, deleteDoc, doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
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
import { GoogleLoginGate } from './components/GoogleLoginGate';
import { MemberProfileModal } from './components/MemberProfileModal';
import { NotificationsModal } from './components/NotificationsModal';
import { SplashScreen } from './components/SplashScreen';
import confetti from 'canvas-confetti';
import { firebaseAuth, firestore, signInWithGoogle } from './services/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';

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
  const [syncError, setSyncError] = useState<string | null>(null);
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
  // Once signed in, Firestore is the shared source for expenses and consented locations.
  useEffect(() => {
    if (!user) return;
    const stopExpenses = onSnapshot(collection(firestore, 'expenses'), (snapshot) => {
      setExpenses(snapshot.docs.map((item) => item.data() as Expense));
    });
    const stopLocations = onSnapshot(collection(firestore, 'locations'), (snapshot) => {
      const locations = new Map(snapshot.docs.map((item) => [item.id, item.data()]));
      setUsers((current) => current.map((member) => {
        const location = locations.get(member.id);
        return location ? { ...member, location } : member;
      }));
    });
    return () => { stopExpenses(); stopLocations(); };
  }, [user?.id]);

  // Member identities are shared data. This makes Google assignments made by
  // Denis visible on every device instead of keeping them only in one browser.
  useEffect(() => {
    if (!firebaseAuth.currentUser) return;
    return onSnapshot(collection(firestore, 'members'), (snapshot) => {
      if (snapshot.empty) return;
      const remoteUsers = snapshot.docs.map((item) => {
        const member = item.data() as User;
        return { ...member, avatarUrl: localAvatar(member.name, member.avatarUrl) };
      });
      setUsers((currentUsers) => {
        // The administrator creates member documents progressively as emails
        // are assigned. Keep the remaining local group members visible until
        // each of them has a cloud document of their own.
        const remoteById = new Map(remoteUsers.map((member) => [member.id, member]));
        const mergedUsers = currentUsers.map((member) => {
          const remote = remoteById.get(member.id);
          return remote ? { ...member, ...remote, avatarUrl: localAvatar(remote.name || member.name, remote.avatarUrl || member.avatarUrl) } : member;
        });
        const additionalUsers = remoteUsers.filter((member) => !currentUsers.some((current) => current.id === member.id));
        const nextUsers = [...mergedUsers, ...additionalUsers];
        saveStoredUsers(nextUsers);
        return nextUsers;
      });
      setUser((current) => current ? remoteUsers.find((member) => member.id === current.id) || current : current);
    }, () => setSyncError('No se pudieron sincronizar los perfiles. Revisá la conexión e intentá de nuevo.'));
  }, [firebaseAuth.currentUser?.uid]);

  // Firebase keeps the Google session in this browser. On a later visit, use
  // its verified email to reopen the assigned profile without asking again.
  useEffect(() => onAuthStateChanged(firebaseAuth, (account) => {
    const email = account?.email?.trim().toLowerCase();
    if (!email || user) return;
    const assigned = users.find((member) => member.linkedAuth?.accountEmail.toLowerCase() === email);
    if (assigned) handleLogin(assigned);
  }), [users, user?.id]);

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
          if (firebaseAuth.currentUser?.email) {
            void setDoc(doc(firestore, 'locations', user.id), {
              ...location,
              ownerEmail: firebaseAuth.currentUser.email.toLowerCase(),
            });
          }
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
  const handleLogin = (newUser: User) => {
    const current = users.find((member) => member.id === newUser.id) || newUser;
    setUser(current);
    setCurrentUser(current.id);
  };

  const handleLogout = () => {
    void signOut(firebaseAuth);
    setUser(null);
    setCurrentUser(null);
  };

  // Handlers for users update
  const handleUpdateUser = async (updatedUser: User): Promise<boolean> => {
    const nextUsers = users.map((u) => (u.id === updatedUser.id ? updatedUser : u));
    setUsers(nextUsers);
    saveStoredUsers(nextUsers);

    // Changes made by the administrator (including account assignments) must
    // reach every phone. A failed write is surfaced instead of silently
    // appearing saved only on this device.
    if (firebaseAuth.currentUser?.email) {
      try {
        await setDoc(doc(firestore, 'members', updatedUser.id), updatedUser);
      } catch {
        setSyncError('No se pudo guardar la asignación. Ingresá con la cuenta administradora denislautaro6@gmail.com y reintentá.');
        return false;
      }
    }

    if (user?.id === updatedUser.id && firebaseAuth.currentUser?.email) {
      const location = nextUsers.find((u) => u.id === updatedUser.id)?.location;
      if (location) {
        void setDoc(doc(firestore, 'locations', updatedUser.id), {
          ...location,
          ownerEmail: firebaseAuth.currentUser.email.toLowerCase(),
        });
      }
    }

    if (user?.id === updatedUser.id) {
      setUser(updatedUser);
    }
    if (inspectedMember?.id === updatedUser.id) {
      setInspectedMember(updatedUser);
    }
    return true;
  };

  // Federated account linking
  const handleLinkFederatedAuth = async (userId: string, provider: 'google' | 'apple', email: string): Promise<boolean> => {
    const cleanEmail = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      setSyncError('Ingresá un correo electrónico válido.');
      return false;
    }
    const linkedToAnotherMember = users.find((member) => member.id !== userId && member.linkedAuth?.accountEmail?.toLowerCase() === cleanEmail);
    if (linkedToAnotherMember) {
      setSyncError(`Ese correo ya está asignado a ${linkedToAnotherMember.name}.`);
      return false;
    }
    const target = users.find((u) => u.id === userId);
    if (!target) return false;

    const updated: User = {
      ...target,
      linkedAuth: {
        provider,
        accountEmail: cleanEmail,
        linkedAt: new Date().toISOString(),
      },
    };
    return handleUpdateUser(updated);
  };

  // Unlink federated account (Admin Denis only)
  const handleUnlinkAuth = (targetUserId: string) => {
    const target = users.find((u) => u.id === targetUserId);
    if (!target) return;

    const updated: User = {
      ...target,
      linkedAuth: undefined,
    };
    handleUpdateUser(updated);
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
      if (firebaseAuth.currentUser?.email) {
        void setDoc(doc(firestore, 'locations', userId), {
          ...location,
          ownerEmail: firebaseAuth.currentUser.email.toLowerCase(),
        });
      }
    }
  };

  // Expenses management
  const handleAddExpense = async (
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

    try {
      await setDoc(doc(firestore, 'expenses', newExpense.id), newExpense);
      const nextExpenses = [newExpense, ...expenses];
      setExpenses(nextExpenses);
      saveStoredExpenses(nextExpenses);
    } catch {
      setSyncError('El gasto no se guardó en la nube. Revisá la conexión e intentá nuevamente.');
    }
  };

  const handleMarkAsPaid = async (expenseId: string) => {
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

    const paidAt = new Date().toISOString();
    try {
      await updateDoc(doc(firestore, 'expenses', expenseId), { isPaid: true, paidAt });
      const committed = nextExpenses.map((expense) => expense.id === expenseId ? { ...expense, paidAt } : expense);
      setExpenses(committed);
      saveStoredExpenses(committed);
    } catch {
      setSyncError('No se pudo marcar el gasto como pagado en la nube.');
    }
  };

  // Only the administrator can invoke this handler from the expenses UI.
  // It intentionally persists an empty list, so a reload cannot restore data.
  const handleClearAllExpenses = async () => {
    if (user?.role !== 'admin') return;
    try {
      await Promise.all(expenses.map((expense) => deleteDoc(doc(firestore, 'expenses', expense.id))));
      setExpenses([]);
      clearStoredExpenses();
    } catch {
      setSyncError('No se pudieron borrar todos los gastos de la nube. No se eliminaron localmente.');
    }
  };

  const handleSaveRouletteResult = (res: RouletteResult) => {
    setRouletteHistory(res);
    saveStoredRoulette(res);
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col justify-between selection:bg-[#0A84FF] selection:text-white">
      {/* Splash Screen */}
      {showSplash && <SplashScreen onFinish={finishSplash} />}

      {syncError && (
        <div role="alert" className="fixed z-[80] top-4 left-4 right-4 max-w-xl mx-auto rounded-2xl border border-[#FF375F]/40 bg-zinc-950 p-3 text-xs text-[#FFB3C1] shadow-2xl flex items-center justify-between gap-3">
          <span>{syncError}</span>
          <button type="button" onClick={() => setSyncError(null)} className="text-white text-[11px] font-bold">Cerrar</button>
        </div>
      )}

      {/* Google Login Gate when user is not logged in */}
      {!user && !showSplash && (
        <GoogleLoginGate
          users={users}
          onLogin={handleLogin}
          onLinkGoogleAuth={(userId, email) => handleLinkFederatedAuth(userId, 'google', email)}
          onRequestGoogleLogin={signInWithGoogle}
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
          onOpenAuthModal={handleLogout}
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

          {activeTab === 'gastos' && (
            <GastosTab
              currentUser={user}
              users={users}
              expenses={expenses}
              onAddExpense={handleAddExpense}
              onMarkAsPaid={handleMarkAsPaid}
              onClearAllExpenses={handleClearAllExpenses}
            />
          )}

          {activeTab === 'perfil' && (
            <PerfilTab
              currentUser={user}
              users={users}
              onUpdateUser={handleUpdateUser}
              onUnlinkAuth={handleUnlinkAuth}
              onLinkAuth={(targetUserId, email) => handleLinkFederatedAuth(targetUserId, 'google', email)}
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
        onSelectAsActiveUser={() => setInspectedMember(null)}
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

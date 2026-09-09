import React, { useEffect, useState } from 'react';
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

export default function App() {
  const [users, setUsers] = useState<User[]>(() => getStoredUsers());
  const [user, setUser] = useState<User | null>(() => getCurrentUser());
  const [activeTab, setActiveTab] = useState<TabType>('ruleta');
  const [expenses, setExpenses] = useState<Expense[]>(() => getStoredExpenses());
  const [rouletteHistory, setRouletteHistory] = useState<RouletteResult | null>(() => getStoredRoulette());
  const [syncError, setSyncError] = useState<string | null>(null);

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
      const remoteUsers = snapshot.docs.map((item) => item.data() as User);
      setUsers((currentUsers) => {
        // The administrator creates member documents progressively as emails
        // are assigned. Keep the remaining local group members visible until
        // each of them has a cloud document of their own.
        const remoteById = new Map(remoteUsers.map((member) => [member.id, member]));
        const mergedUsers = currentUsers.map((member) => remoteById.get(member.id) || member);
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
  const handleUpdateUser = (updatedUser: User) => {
    const nextUsers = users.map((u) => (u.id === updatedUser.id ? updatedUser : u));
    setUsers(nextUsers);
    saveStoredUsers(nextUsers);

    // Changes made by the administrator (including account assignments) must
    // reach every phone. A failed write is surfaced instead of silently
    // appearing saved only on this device.
    if (firebaseAuth.currentUser?.email) {
      void setDoc(doc(firestore, 'members', updatedUser.id), updatedUser)
        .catch(() => setSyncError('El cambio no se guardó en la nube. Verificá que ingresaste como Denis y reintentá.'));
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
  };

  // Federated account linking
  const handleLinkFederatedAuth = (userId: string, provider: 'google' | 'apple', email: string) => {
    const cleanEmail = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      setSyncError('Ingresá un correo electrónico válido.');
      return;
    }
    const linkedToAnotherMember = users.find((member) => member.id !== userId && member.linkedAuth?.accountEmail.toLowerCase() === cleanEmail);
    if (linkedToAnotherMember) {
      setSyncError(`Ese correo ya está asignado a ${linkedToAnotherMember.name}.`);
      return;
    }
    const target = users.find((u) => u.id === userId);
    if (!target) return;

    const updated: User = {
      ...target,
      linkedAuth: {
        provider,
        accountEmail: cleanEmail,
        linkedAt: new Date().toISOString(),
      },
    };
    handleUpdateUser(updated);
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
      {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}

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

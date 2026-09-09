import React, { useEffect, useState } from 'react';
import { Expense, ProximityAlert, RouletteResult, User } from './types';
import {
  checkBirthdays,
  evaluateProximityAlerts,
  getCurrentUser,
  getStoredExpenses,
  getStoredRoulette,
  getStoredUsers,
  saveStoredExpenses,
  saveStoredRoulette,
  saveStoredUsers,
  setCurrentUser,
} from './services/storage';
import { Header } from './components/Header';
import { TabBar, TabType } from './components/TabBar';
import { RuletaTab } from './components/tabs/RuletaTab';
import { MapaTab } from './components/tabs/MapaTab';
import { GastosTab } from './components/tabs/GastosTab';
import { PerfilTab } from './components/tabs/PerfilTab';
import { AuthModal } from './components/AuthModal';
import { GoogleLoginGate } from './components/GoogleLoginGate';
import { MemberProfileModal } from './components/MemberProfileModal';
import { NotificationsModal } from './components/NotificationsModal';
import { SplashScreen } from './components/SplashScreen';
import confetti from 'canvas-confetti';

export default function App() {
  const [users, setUsers] = useState<User[]>(() => getStoredUsers());
  const [user, setUser] = useState<User | null>(() => getCurrentUser());
  const [activeTab, setActiveTab] = useState<TabType>('ruleta');
  const [expenses, setExpenses] = useState<Expense[]>(() => getStoredExpenses());
  const [rouletteHistory, setRouletteHistory] = useState<RouletteResult | null>(() => getStoredRoulette());

  // Modals & UI states
  const [showSplash, setShowSplash] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [inspectedMember, setInspectedMember] = useState<User | null>(null);

  // Birthday simulation state
  const [simulatedDate, setSimulatedDate] = useState<{ day: number; month: number } | null>(null);

  // Evaluated Proximity Alerts
  const [proximityAlerts, setProximityAlerts] = useState<ProximityAlert[]>([]);

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
    setUser(newUser);
    setCurrentUser(newUser.id);
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentUser(null);
  };

  // Handlers for users update
  const handleUpdateUser = (updatedUser: User) => {
    const nextUsers = users.map((u) => (u.id === updatedUser.id ? updatedUser : u));
    setUsers(nextUsers);
    saveStoredUsers(nextUsers);

    if (user?.id === updatedUser.id) {
      setUser(updatedUser);
    }
    if (inspectedMember?.id === updatedUser.id) {
      setInspectedMember(updatedUser);
    }
  };

  // Federated account linking
  const handleLinkFederatedAuth = (userId: string, provider: 'google' | 'apple', email: string) => {
    const target = users.find((u) => u.id === userId);
    if (!target) return;

    const updated: User = {
      ...target,
      linkedAuth: {
        provider,
        accountEmail: email,
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
    const nextUsers = users.map((u) => {
      if (u.id === userId) {
        return {
          ...u,
          location: {
            lat,
            lng,
            isActive,
            lastUpdated: new Date().toISOString(),
            label: label || u.location?.label,
          },
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

  // Geofence Scenario Presets for instant testing
  const handleSetPresetScenario = (scenario: 'couple' | 'group' | 'all' | 'dispersed') => {
    // If the current user has an active real GPS location, anchor the scenario around them!
    const baseLat = user?.location?.isActive ? user.location.lat : -34.6083;
    const baseLng = user?.location?.isActive ? user.location.lng : -58.3644;
    const baseLabel = user?.location?.label || 'Puerto Madero';

    const nextUsers = users.map((u) => {
      if (scenario === 'couple') {
        // Denis and Maxi within 25 meters on the bridge; others offline or far
        if (u.id === 'denis') {
          return {
            ...u,
            location: { lat: baseLat, lng: baseLng, isActive: true, label: 'Puente de la Mujer (Norte)' },
          };
        }
        if (u.id === 'maxi') {
          return {
            ...u,
            location: { lat: baseLat + 0.00015, lng: baseLng + 0.00015, isActive: true, label: 'Puente de la Mujer (Sur)' }, // ~22m away
          };
        }
        return {
          ...u,
          location: { ...(u.location || { lat: baseLat - 0.01, lng: baseLng - 0.01 }), isActive: false },
        };
      } else if (scenario === 'group') {
        // Denis, Maxi, Drizza and Alan (4 members) within 35m; Castro & Alca separated
        if (['denis', 'maxi', 'drizza', 'alan'].includes(u.id)) {
          const offset = (['denis', 'maxi', 'drizza', 'alan'].indexOf(u.id)) * 0.0001;
          return {
            ...u,
            location: {
              lat: baseLat + offset,
              lng: baseLng + offset,
              isActive: true,
              label: 'Antares Puerto Madero',
            },
          };
        }
        return {
          ...u,
          location: { ...(u.location || { lat: baseLat - 0.02, lng: baseLng - 0.02 }), isActive: false },
        };
      } else if (scenario === 'all') {
        // All 6 members gathered at Puente de la Mujer (<50m)
        const offset = users.findIndex((m) => m.id === u.id) * 0.00008;
        return {
          ...u,
          location: {
            lat: baseLat + offset,
            lng: baseLng + offset,
            isActive: true,
            label: 'Puente de la Mujer (Grupo Unido)',
          },
        };
      } else {
        // Dispersed: each member at distinct distant locations
        const coordinatesList = [
          { lat: -34.6083, lng: -58.3644, label: 'Puente de la Mujer' },
          { lat: -34.6180, lng: -58.3580, label: 'Casino Puerto Madero' },
          { lat: -34.6010, lng: -58.3690, label: 'Hotel Hilton' },
          { lat: -34.6140, lng: -58.3620, label: 'Faena Hotel' },
          { lat: -34.6095, lng: -58.3750, label: 'Casa Rosada' },
          { lat: -34.6030, lng: -58.3620, label: 'Yacht Club' },
        ];
        const idx = users.findIndex((m) => m.id === u.id);
        const coord = coordinatesList[idx] || coordinatesList[0];
        return {
          ...u,
          location: {
            lat: coord.lat,
            lng: coord.lng,
            isActive: true,
            label: coord.label,
          },
        };
      }
    });

    setUsers(nextUsers);
    saveStoredUsers(nextUsers);

    if (user) {
      setUser(nextUsers.find((u) => u.id === user.id) || null);
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

  const handleSaveRouletteResult = (res: RouletteResult) => {
    setRouletteHistory(res);
    saveStoredRoulette(res);
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col justify-between selection:bg-[#0A84FF] selection:text-white">
      {/* Splash Screen */}
      {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}

      {/* Google Login Gate when user is not logged in */}
      {!user && !showSplash && (
        <GoogleLoginGate
          users={users}
          onLogin={handleLogin}
          onLinkGoogleAuth={(userId, email) => handleLinkFederatedAuth(userId, 'google', email)}
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
          onOpenAuthModal={() => setShowAuthModal(true)}
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
              onSetPresetScenario={handleSetPresetScenario}
            />
          )}

          {activeTab === 'gastos' && (
            <GastosTab
              currentUser={user}
              users={users}
              expenses={expenses}
              onAddExpense={handleAddExpense}
              onMarkAsPaid={handleMarkAsPaid}
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

      {/* Auth Modal with direct login & "¿Quién sos?" */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        currentUser={user}
        users={users}
        onLogin={handleLogin}
        onLogout={handleLogout}
        onLinkFederatedAuth={handleLinkFederatedAuth}
      />

      {/* Inspected Member Profile Modal (Carousel tap) */}
      <MemberProfileModal
        member={inspectedMember}
        currentUser={user}
        expenses={expenses}
        onClose={() => setInspectedMember(null)}
        onSelectAsActiveUser={(target) => {
          handleLogin(target);
          setInspectedMember(null);
        }}
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

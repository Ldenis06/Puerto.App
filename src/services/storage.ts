import { Expense, ProximityAlert, RouletteResult, User } from '../types';
import { INITIAL_EXPENSES, INITIAL_USERS } from '../data/initialData';

const USERS_KEY = 'puerto_app_users_v1';
const EXPENSES_KEY = 'puerto_app_expenses_v1';
const CURRENT_USER_KEY = 'puerto_app_current_user_v1';
const ROULETTE_KEY = 'puerto_app_roulette_v1';
const DISMISSED_ALERTS_KEY = 'puerto_app_dismissed_alerts_v1';
const LOCATION_SHARING_KEY = 'puerto_app_location_sharing_v1';

function mergeWithInitialUsers(users: User[]): User[] {
  const savedById = new Map(users.filter((user) => user?.id).map((user) => [user.id, user]));
  const baseUsers = INITIAL_USERS.map((base) => ({ ...base, ...(savedById.get(base.id) || {}) }));
  const extras = users.filter((user) => user?.id && !INITIAL_USERS.some((base) => base.id === user.id));
  return [...baseUsers, ...extras];
}

export function getStoredUsers(): User[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) {
      localStorage.setItem(USERS_KEY, JSON.stringify(INITIAL_USERS));
      return INITIAL_USERS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const denis = parsed.find((u: User) => u.id === 'denis');
      if (denis && !denis.linkedAuth) {
        denis.linkedAuth = {
          provider: 'google',
          accountEmail: 'denislautaro6@gmail.com',
          linkedAt: '2025-01-01T00:00:00.000Z',
        };
      }
      return mergeWithInitialUsers(parsed);
    }
    return INITIAL_USERS;
  } catch {
    return INITIAL_USERS;
  }
}

export function saveStoredUsers(users: User[]): void {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function getCurrentUser(): User | null {
  try {
    const id = localStorage.getItem(CURRENT_USER_KEY);
    if (!id) {
      return null;
    }
    const users = getStoredUsers();
    return users.find((u) => u.id === id) || null;
  } catch {
    return null;
  }
}

export function setCurrentUser(userId: string | null): void {
  if (userId) {
    localStorage.setItem(CURRENT_USER_KEY, userId);
  } else {
    localStorage.removeItem(CURRENT_USER_KEY);
  }
}

export function isLocationSharingEnabled(userId: string): boolean {
  return localStorage.getItem(`${LOCATION_SHARING_KEY}_${userId}`) === 'true';
}

export function setLocationSharingEnabled(userId: string, enabled: boolean): void {
  localStorage.setItem(`${LOCATION_SHARING_KEY}_${userId}`, String(enabled));
}

export function getStoredExpenses(): Expense[] {
  try {
    const raw = localStorage.getItem(EXPENSES_KEY);
    if (!raw) {
      localStorage.setItem(EXPENSES_KEY, JSON.stringify(INITIAL_EXPENSES));
      return INITIAL_EXPENSES;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : INITIAL_EXPENSES;
  } catch {
    return INITIAL_EXPENSES;
  }
}

export function saveStoredExpenses(expenses: Expense[]): void {
  localStorage.setItem(EXPENSES_KEY, JSON.stringify(expenses));
}

/**
 * Keeps the expenses collection present but empty. Removing the key would make
 * getStoredExpenses seed the sample expenses again on the next page load.
 */
export function clearStoredExpenses(): void {
  localStorage.setItem(EXPENSES_KEY, JSON.stringify([]));
}

export function getStoredRoulette(): RouletteResult | null {
  try {
    const raw = localStorage.getItem(ROULETTE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveStoredRoulette(result: RouletteResult): void {
  localStorage.setItem(ROULETTE_KEY, JSON.stringify(result));
}

// Distance calculation using Haversine formula (returns meters)
export function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // metres
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// Check proximity alerts among active users
export function evaluateProximityAlerts(users: User[]): ProximityAlert[] {
  const activeUsers = users.filter((u) => u.location && u.location.isActive);
  if (activeUsers.length < 2) return [];

  const alerts: ProximityAlert[] = [];
  const visitedPairs = new Set<string>();
  const clusters: User[][] = [];

  // Group users that are within 50 meters
  for (let i = 0; i < activeUsers.length; i++) {
    const u1 = activeUsers[i];
    let addedToCluster = false;

    for (const cluster of clusters) {
      const isCloseToCluster = cluster.some((member) => {
        const d = calculateDistanceMeters(
          u1.location!.lat,
          u1.location!.lng,
          member.location!.lat,
          member.location!.lng
        );
        return d <= 50;
      });

      if (isCloseToCluster) {
        cluster.push(u1);
        addedToCluster = true;
        break;
      }
    }

    if (!addedToCluster) {
      clusters.push([u1]);
    }
  }

  // Evaluate clusters
  for (const cluster of clusters) {
    if (cluster.length === 6) {
      alerts.push({
        id: `alert-all-${Date.now()}`,
        type: 'all',
        text: 'El grupo está unido en el mismo lugar.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        memberIds: cluster.map((m) => m.id),
      });
    } else if (cluster.length >= 3 && cluster.length <= 5) {
      const names = cluster.map((m) => m.name).join(', ');
      alerts.push({
        id: `alert-group-${cluster.map((m) => m.id).sort().join('-')}`,
        type: 'group',
        text: `${names} están juntos.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        memberIds: cluster.map((m) => m.id),
      });
    } else if (cluster.length === 2) {
      const pairKey = [cluster[0].id, cluster[1].id].sort().join('-');
      if (!visitedPairs.has(pairKey)) {
        visitedPairs.add(pairKey);
        alerts.push({
          id: `alert-couple-${pairKey}`,
          type: 'couple',
          text: `${cluster[0].name} y ${cluster[1].name} están teniendo relaciones amorosas.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          memberIds: [cluster[0].id, cluster[1].id],
        });
      }
    }
  }

  return alerts;
}

// Check birthday logic
export function checkBirthdays(users: User[], currentUser: User | null, simulatedDate?: { day: number; month: number }) {
  const today = new Date();
  const currentDay = simulatedDate ? simulatedDate.day : today.getDate();
  const currentMonth = simulatedDate ? simulatedDate.month : today.getMonth() + 1; // 1-indexed

  const dayStr = String(currentDay).padStart(2, '0');
  const monthStr = String(currentMonth).padStart(2, '0');
  const todayFormatted = `${dayStr}/${monthStr}`;

  const birthdayMembers = users.filter((u) => u.birthday === todayFormatted);
  if (birthdayMembers.length === 0 || !currentUser) return null;

  // Is current user celebrant?
  const isCurrentUserCelebrant = birthdayMembers.some((m) => m.id === currentUser.id);

  if (isCurrentUserCelebrant) {
    return {
      isCelebrant: true,
      celebrantName: currentUser.name,
      message: `¡Feliz cumpleaños, ${currentUser.name}! Hoy se festeja fuerte en Puerto Madero.`,
      todayFormatted,
    };
  }

  // Not celebrant: private notification to congratulate the birthday member(s)
  const celebrant = birthdayMembers[0];
  return {
    isCelebrant: false,
    celebrantName: celebrant.name,
    message: `Hoy es el cumpleaños de ${celebrant.name}. ¡No te olvides de saludarlo!`,
    todayFormatted,
  };
}

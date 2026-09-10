export type Role = 'admin' | 'member';

export interface UserLocation {
  lat: number;
  lng: number;
  lastUpdated: string;
  isActive: boolean;
  label?: string;
}

export interface User {
  id: string;
  name: string;
  role: Role;
  pin: string;
  birthday: string; // DD/MM
  bio: string;
  aiDescription: string;
  avatarUrl: string;
  location?: UserLocation;
}

export interface Expense {
  id: string;
  concept: string;
  totalAmount: number;
  payerId: string;
  participantIds: string[]; // List of user IDs sharing the expense
  createdAt: string;
  isPaid: boolean;
  paidAt?: string;
  individualQuota: number;
}

export interface NotebookNote {
  id: string;
  body: string;
  author_name: string;
  created_at: string;
}

export type RouletteMode = 'pairs' | 'trios' | 'solo';

export interface RouletteTeam {
  name: string;
  members: string[]; // user IDs
  substituteIds?: string[]; // user IDs designated as substitutes (underlined in UI)
}

export interface RouletteResult {
  id: string;
  mode: RouletteMode;
  date: string;
  teams: RouletteTeam[];
}

export interface ProximityAlert {
  id: string;
  type: 'couple' | 'group' | 'all';
  text: string;
  timestamp: string;
  memberIds: string[];
}

export interface BirthdayNotification {
  id: string;
  targetUserId: string;
  targetUserName: string;
  isCelebrant: boolean;
  message: string;
  date: string;
}

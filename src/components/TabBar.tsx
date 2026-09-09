import React from 'react';
import { Dices, MapPin, Receipt, User } from 'lucide-react';

export type TabType = 'ruleta' | 'mapa' | 'gastos' | 'perfil';

interface Props {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
  pendingDebtCount?: number;
}

export const TabBar: React.FC<Props> = ({ activeTab, onChangeTab, pendingDebtCount = 0 }) => {
  const tabs = [
    { id: 'ruleta' as TabType, label: 'Ruleta', icon: Dices },
    { id: 'mapa' as TabType, label: 'Mapa', icon: MapPin },
    { id: 'gastos' as TabType, label: 'Gastos', icon: Receipt, badge: pendingDebtCount },
    { id: 'perfil' as TabType, label: 'Perfil', icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-black/90 backdrop-blur-2xl border-t border-white/10 pb-[env(safe-area-inset-bottom,16px)]">
      <div className="max-w-md mx-auto px-6 py-2 flex items-center justify-between">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              id={`tab-btn-${tab.id}`}
              type="button"
              onClick={() => onChangeTab(tab.id)}
              className={`relative flex flex-col items-center justify-center py-1 px-3 min-w-[64px] transition-all duration-200 active:scale-95 ${
                isActive ? 'text-[#0A84FF]' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <div className="relative">
                <Icon
                  className={`w-6 h-6 transition-transform duration-200 ${
                    isActive ? 'scale-110 stroke-[2.4px]' : 'scale-100 stroke-[1.8px]'
                  }`}
                />
                {tab.badge && tab.badge > 0 ? (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 bg-[#FF375F] text-[10px] font-extrabold text-white rounded-full flex items-center justify-center shadow-[0_0_8px_#FF375F]">
                    {tab.badge}
                  </span>
                ) : null}
              </div>
              <span
                className={`text-[11px] mt-1 font-medium tracking-tight transition-colors duration-200 ${
                  isActive ? 'font-bold text-[#0A84FF]' : 'text-zinc-500'
                }`}
              >
                {tab.label}
              </span>

              {/* iOS style subtle active pill glow indicator */}
              {isActive && (
                <span className="absolute -bottom-1 w-6 h-0.5 bg-gradient-to-r from-[#0A84FF] to-[#5AC8FA] rounded-full shadow-[0_0_8px_#0A84FF]" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

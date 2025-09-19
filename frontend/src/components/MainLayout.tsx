import React from 'react';
import icProfile from '../assets/tab-profile.svg';
import icShop from '../assets/tab-shop.svg';
import icGarden from '../assets/tab-garden.svg';
import icInventory from '../assets/tab-inventory.svg';
import { ToastFn } from '../types';
import { ProfileTab } from './tabs/ProfileTab';
import { ShopTab } from './tabs/ShopTab';
import { GardenTab } from './tabs/GardenTab';
import { InventoryTab } from './tabs/InventoryTab';

type TabKey = 'profile' | 'shop' | 'garden' | 'inventory';

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'profile', label: 'Профиль', icon: icProfile },
  { key: 'shop', label: 'Магазин', icon: icShop },
  { key: 'garden', label: 'Грядка', icon: icGarden },
  { key: 'inventory', label: 'Инвентарь', icon: icInventory }
];

interface MainLayoutProps {
  onLogout: () => void;
  onToast: ToastFn;
}

export function MainLayout({ onLogout, onToast }: MainLayoutProps) {
  const [activeTab, setActiveTab] = React.useState<TabKey>('profile');

  return (
    <>
      <header className="header">
        <div className="logo">🥕</div>
        <div className="badge">Ферма</div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button className="btn danger" onClick={onLogout}>
            Выйти
          </button>
        </div>
      </header>

      <nav className="tabs">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={`tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <img src={tab.icon} alt="" />
            {tab.label}
          </button>
        ))}
      </nav>

      <main style={{ padding: 20 }}>
        {activeTab === 'profile' && <ProfileTab onToast={onToast} />}
        {activeTab === 'shop' && <ShopTab onToast={onToast} />}
        {activeTab === 'garden' && <GardenTab onToast={onToast} />}
        {activeTab === 'inventory' && <InventoryTab onToast={onToast} />}
      </main>
    </>
  );
}

export default MainLayout;
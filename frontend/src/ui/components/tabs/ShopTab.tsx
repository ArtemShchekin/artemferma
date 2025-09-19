import React from 'react';
import { api } from '../../../api';
import { ToastFn } from '../../../types';
import icBuy from '../../assets/btn-buy.svg';
import icSell from '../../assets/btn-sell.svg';

import {
  ADVANCED_SEED_TYPES,
  BASE_SEED_TYPES,
  SEED_ICONS,
  SEED_NAMES,
  SeedType
} from '../../constants/seeds';

interface PricesResponse {
  purchase: { basePrice: number; advPrice: number };
  sale: { basePrice: number; advPrice: number };
}

interface ProfileSummary {
  level: number;
}

interface InventoryItem {
  id: number;
  type: SeedType;
}

interface InventoryResponse {
  seeds: InventoryItem[];
  vegRaw: InventoryItem[];
  vegWashed: InventoryItem[];
}

type ShopMode = 'buy' | 'sell';

interface ShopTabProps {
  onToast: ToastFn;
}

export function ShopTab({ onToast }: ShopTabProps) {
  const [mode, setMode] = React.useState<ShopMode>('buy');
  const [prices, setPrices] = React.useState<PricesResponse | null>(null);
  const [profile, setProfile] = React.useState<ProfileSummary | null>(null);
  const [inventory, setInventory] = React.useState<InventoryResponse>({ seeds: [], vegRaw: [], vegWashed: [] });

  const loadData = React.useCallback(async () => {
    const [profileResponse, pricesResponse, inventoryResponse] = await Promise.all([
      api.get<ProfileSummary>('/profile'),
      api.get<PricesResponse>('/shop/prices'),
      api.get<InventoryResponse>('/inventory')
    ]);

    setProfile(profileResponse.data);
    setPrices(pricesResponse.data);
    setInventory(inventoryResponse.data);
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleBuy = async (type: SeedType) => {
    await api.post('/shop/buy', { type });
    onToast('Куплено');
    loadData();
  };

  const handleSell = async (inventoryId: number) => {
    await api.post('/shop/sell', { inventoryId });
    onToast('Продано');
    loadData();
  };

  if (!prices || !profile) {
    return <div className="card">Загрузка...</div>;
  }

  return (
    <div className="grid">
      <div className="row" style={{ gap: 8 }}>
        <button className={`tab ${mode === 'buy' ? 'active' : ''}`} onClick={() => setMode('buy')}>
          <img src={icBuy} alt="" /> Покупка
        </button>
        <button className={`tab ${mode === 'sell' ? 'active' : ''}`} onClick={() => setMode('sell')}>
          <img src={icSell} alt="" /> Продажа
        </button>
      </div>

      {mode === 'buy' ? (
        <div className="grid">
          <div className="card grid">
            <h3>Семена уровня 1 (по {prices.purchase.basePrice} ₽)</h3>
            {BASE_SEED_TYPES.map((type) => (
              <div key={type} className="shop-item">
                <div className="shop-left">
                  <img src={SEED_ICONS[type]} alt="" />
                  <div>{SEED_NAMES[type]}</div>
                </div>
                <button className="btn" onClick={() => handleBuy(type)}>
                  <img src={icBuy} alt="" /> Купить
                </button>
              </div>
            ))}
          </div>

          <div className="card grid">
            <h3>Семена уровня 2 (по {prices.purchase.advPrice} ₽) — открываются после 50 продаж</h3>
            {ADVANCED_SEED_TYPES.map((type) => (
              <div key={type} className="shop-item" style={{ opacity: profile.level < 2 ? 0.5 : 1 }}>
                <div className="shop-left">
                  <img src={SEED_ICONS[type]} alt="" />
                  <div>{SEED_NAMES[type]}</div>
                </div>
                <button className="btn" disabled={profile.level < 2} onClick={() => handleBuy(type)}>
                  <img src={icBuy} alt="" /> Купить
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="card grid">
          {inventory.vegWashed.length === 0 ? (
            <div>Пусто</div>
          ) : (
            inventory.vegWashed.map((item) => (
              <div key={item.id} className="shop-item">
                <div className="shop-left">
                  <img src={SEED_ICONS[item.type]} alt="" />
                  <div>{SEED_NAMES[item.type]}</div>
                </div>
                <button className="btn" onClick={() => handleSell(item.id)}>
                  <img src={icSell} alt="" /> Продать
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default ShopTab;
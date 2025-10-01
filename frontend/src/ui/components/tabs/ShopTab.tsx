import React from 'react';
import { api } from '../../../api';
import { ToastFn } from '../../../types';
import icBuy from '../../assets/btn-buy.svg';
import icSell from '../../assets/btn-sell.svg';
import yogurtIcon from '../../assets/yogurt.svg';
import sunflowerOilIcon from '../../assets/sunflower-oil.svg';

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
  interface SupplyPrice {
  price: number;
  volume: number;
}

interface PricesResponse {
  purchase: { basePrice: number; advPrice: number };
  sale: { basePrice: number; advPrice: number };
  supplies: { yogurt: SupplyPrice; sunflowerOil: SupplyPrice };
}

interface ProfileSummary {
  level: number;
  prices?: PricesResponse;
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
  const [profile, setProfile] = React.useState<ProfileSummary | null>(null);
  const [prices, setPrices] = React.useState<PricesResponse | null>(null);
  const [inventory, setInventory] = React.useState<InventoryResponse>({ seeds: [], vegRaw: [], vegWashed: [] });
  const [error, setError] = React.useState<string | null>(null);

  const loadData = React.useCallback(async () => {
    try {
      setError(null);
      const [profileResponse, inventoryResponse] = await Promise.all([
        api.get<ProfileSummary>('/profile'),
        api.get<InventoryResponse>('/inventory')
      ]);

      const nextProfile = profileResponse.data;
      let nextPrices: PricesResponse | null = nextProfile.prices ?? null;

      if (!nextPrices) {
        const { data: fallbackPrices } = await api.get<PricesResponse>('/shop/prices');
        nextPrices = fallbackPrices;
      }

      setProfile(nextProfile);
      setPrices(nextPrices);
      setInventory(inventoryResponse.data);
      return true;
    } catch (loadError) {
      console.error('Failed to load shop data', loadError);
      setError('Не удалось загрузить магазин');
      return false;
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleBuy = async (type: SeedType) => {
    try {
      await api.post('/shop/buy', { type });
      onToast('Куплено');
      const refreshed = await loadData();
      if (!refreshed) {
        onToast('Не удалось обновить данные магазина');
      }
    } catch (buyError) {
      console.error('Failed to buy seed', buyError);
      onToast('Не удалось купить');
    }
  };

  const handleSell = async (inventoryId: number) => {
    try {
      await api.post('/shop/sell', { inventoryId });
      onToast('Продано');
      const refreshed = await loadData();
      if (!refreshed) {
        onToast('Не удалось обновить данные магазина');
      }
    } catch (sellError) {
      console.error('Failed to sell harvest', sellError);
      onToast('Не удалось продать урожай');
    }
  };
  const handleBuySupply = async (supply: 'yogurt' | 'sunflowerOil') => {
    try {
      await api.post('/shop/buy-supply', { supply });
      onToast('Куплено');
      const refreshed = await loadData();
      if (!refreshed) {
        onToast('Не удалось обновить данные магазина');
      }
    } catch (error) {
      console.error('Failed to buy supply', error);
      onToast('Не удалось купить товар');
    }
  };

  if (!profile || !prices) {
    return <div className="card">{error ?? 'Загрузка...'}</div>;
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
          <div className="card grid">
            <h3>Продукты для кухни</h3>
            <div className="shop-item">
              <div className="shop-left">
                <img src={yogurtIcon} alt="" />
                <div>Йогурт ({prices.supplies.yogurt.volume} мл)</div>
              </div>
              <button className="btn" onClick={() => handleBuySupply('yogurt')}>
                <img src={icBuy} alt="" /> Купить за {prices.supplies.yogurt.price} ₽
              </button>
            </div>
            <div className="shop-item">
              <div className="shop-left">
                <img src={sunflowerOilIcon} alt="" />
                <div>Подсолнечное масло ({prices.supplies.sunflowerOil.volume} мл)</div>
              </div>
              <button className="btn" onClick={() => handleBuySupply('sunflowerOil')}>
                <img src={icBuy} alt="" /> Купить за {prices.supplies.sunflowerOil.price} ₽
              </button>
            </div>
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
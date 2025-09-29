import React from 'react';
import { api } from '../../../api';
import { ToastFn } from '../../../types';
import icWash from '../../assets/btn-wash.svg';
import { SEED_ICONS, SEED_NAMES, SeedType } from '../../constants/seeds';

interface InventoryItem {
  id: number;
  type: SeedType;
  status: string;
  created_at: string;
}

interface InventoryResponse {
  seeds: InventoryItem[];
  vegRaw: InventoryItem[];
  vegWashed: InventoryItem[];
}

interface InventoryTabProps {
  onToast: ToastFn;
}

export function InventoryTab({ onToast }: InventoryTabProps) {
  const [inventory, setInventory] = React.useState<InventoryResponse>({ seeds: [], vegRaw: [], vegWashed: [] });

  const loadInventory = React.useCallback(async () => {
    const { data } = await api.get<InventoryResponse>('/inventory');
    setInventory(data);
  }, []);

  React.useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  const wash = async (inventoryId: number) => {
    await api.patch(`/inventory/wash/${inventoryId}`);
    onToast('Вымыто');
    loadInventory();
  };

  return (
    <div className="grid">
      <div className="card">
        <h3>Семена</h3>
        {inventory.seeds.length === 0 ? (
          <div>Пусто</div>
        ) : (
          <div className="grid">
            {inventory.seeds.map((seed) => (
              <div key={seed.id} className="shop-item">
                <div className="shop-left">
                  <img src={SEED_ICONS[seed.type]} alt="" />
                  <div>{SEED_NAMES[seed.type]}</div>
                </div>
                <div className="badge">{new Date(seed.created_at).toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h3>Свежесобранные овощи</h3>
        {inventory.vegRaw.length === 0 ? (
          <div>Пусто</div>
        ) : (
          <div className="grid">
            {inventory.vegRaw.map((item) => (
              <div key={item.id} className="shop-item">
                <div className="shop-left">
                  <img src={SEED_ICONS[item.type]} alt="" />
                  <div>{SEED_NAMES[item.type]}</div>
                </div>
                <button className="btn" onClick={() => wash(item.id)}>
                  <img src={icWash} alt="" /> Помыть
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h3>Готовые к продаже овощи</h3>
        {inventory.vegWashed.length === 0 ? (
          <div>Пусто</div>
        ) : (
          <div className="grid">
            {inventory.vegWashed.map((item) => (
              <div key={item.id} className="shop-item">
                <div className="shop-left">
                  <img src={SEED_ICONS[item.type]} alt="" />
                  <div>{SEED_NAMES[item.type]}</div>
                </div>
                <div className="badge">{item.status}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default InventoryTab;
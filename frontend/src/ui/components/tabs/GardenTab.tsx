import React from 'react';
import { api } from '../../../api';
import { ToastFn } from '../../../types';
import icPlant from '../../assets/btn-plant.svg';
import { SEED_ICONS, SEED_NAMES, SeedType } from '../../constants/seeds';


interface Plot {
  slot: number;
  type: SeedType | null;
  plantedAt: string | null;
  matured: boolean;
  harvested: boolean;
}

interface InventorySeed {
  id: number;
  type: SeedType;
}

interface InventoryResponse {
  seeds: InventorySeed[];
}

interface GardenTabProps {
  onToast: ToastFn;
}

export function GardenTab({ onToast }: GardenTabProps) {
  const [plots, setPlots] = React.useState<Plot[]>([]);
  const [inventory, setInventory] = React.useState<InventorySeed[]>([]);
  const [growthMinutes, setGrowthMinutes] = React.useState(10);
  const [, forceTick] = React.useReducer((tick) => tick + 1, 0);

  const loadData = React.useCallback(async () => {
    const plotsResponse = await api.get<{ plots: Plot[]; growthMinutes: number }>('/garden/plots');
    const plotList = Array.isArray(plotsResponse.data?.plots) ? plotsResponse.data.plots : [];
    setPlots(plotList);

    const inventoryResponse = await api.get<InventoryResponse>('/inventory');
    setInventory(inventoryResponse.data.seeds);

    const minutes = plotsResponse.data?.growthMinutes;
    const parsed = typeof minutes === 'number' ? minutes : Number(minutes);
    setGrowthMinutes(Number.isFinite(parsed) ? parsed : 10);
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  React.useEffect(() => {
    const timer = setInterval(() => forceTick(), 1000);
    return () => clearInterval(timer);
  }, []);

  const plant = async (slot: number, inventoryId: number) => {
    await api.post('/garden/plant', { slot, inventoryId });
    onToast('Посажено');
    loadData();
  };

  const harvest = async (slot: number) => {
    await api.post('/garden/harvest', { slot });
    onToast('Собрано');
    loadData();
  };

  const remainingTime = (plantedAt: string | null) => {
    if (!plantedAt) {
      return '';
    }
    const planted = new Date(plantedAt).getTime();
    const now = Date.now();
    const total = growthMinutes * 60 * 1000;
    const passed = now - planted;
    const left = Math.max(0, total - passed);
    const minutes = Math.floor(left / 60000);
    const seconds = Math.floor((left % 60000) / 1000);
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  };

  return (
    <div className="grid">
      <div className="grid grid-3">
        {plots.map((plot) => (
          <div key={plot.slot} className="slot card">
            {!plot.type || plot.harvested ? (
              <div style={{ textAlign: 'center' }}>
                <div>Пустая грядка #{plot.slot}</div>
                <SeedPicker seeds={inventory} onPick={(seedId) => plant(plot.slot, seedId)} />
              </div>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
                  <img src={SEED_ICONS[plot.type]} style={{ width: 32, height: 32 }} alt="" />
                  <div>
                    Растёт: <b>{SEED_NAMES[plot.type]}</b>
                  </div>
                </div>
                {plot.matured ? (
                  <button className="btn" onClick={() => harvest(plot.slot)}>
                    <img src={icPlant} alt="" /> Собрать
                  </button>
                ) : (
                  <div>Созревание: {remainingTime(plot.plantedAt)}</div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

interface SeedPickerProps {
  seeds: InventorySeed[];
  onPick: (inventoryId: number) => void;
}

function SeedPicker({ seeds, onPick }: SeedPickerProps) {
  const [open, setOpen] = React.useState(false);

  if (!open) {
    return (
      <button className="btn" onClick={() => setOpen(true)}>
        <img src={icPlant} alt="" /> Посадить
      </button>
    );
  }

  return (
    <div className="card" style={{ background: '#fff' }}>
      {seeds.length === 0 ? (
        'Нет семян'
      ) : (
        seeds.map((seed) => (
          <div key={seed.id} className="shop-item">
            <div className="shop-left">
              <img src={SEED_ICONS[seed.type]} alt="" />
              <div>{SEED_NAMES[seed.type]}</div>
            </div>
            <button
              className="btn"
              onClick={() => {
                onPick(seed.id);
                setOpen(false);
              }}
            >
              <img src={icPlant} alt="" /> Выбрать
            </button>
          </div>
        ))
      )}
    </div>
  );
}

export default GardenTab;
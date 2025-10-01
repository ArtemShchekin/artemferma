import React from 'react';
import { api } from '../../../api';
import { ToastFn } from '../../../types';
import { SEED_ICONS, SEED_NAMES } from '../../constants/seeds';
import yogurtIcon from '../../assets/yogurt.svg';
import sunflowerOilIcon from '../../assets/sunflower-oil.svg';

interface KitchenState {
  vegetables: Record<string, number>;
  yogurtMl: number;
  sunflowerOilMl: number;
  saladsEaten: number;
  isFatFarmer: boolean;
}

interface KitchenTabProps {
  onToast: ToastFn;
}

const FRUIT_RECIPE = {
  veg: { mango: 3 },
  liquids: { yogurtMl: 1000 }
};

const VEGETABLE_RECIPE = {
  veg: { carrot: 3, cabbage: 3, radish: 2 },
  liquids: { sunflowerOilMl: 100 }
};

type FruitSelection = {
  mango: number;
  yogurtMl: number;
};

type VegetableSelection = {
  carrot: number;
  cabbage: number;
  radish: number;
  sunflowerOilMl: number;
};

const INITIAL_FRUIT_SELECTION: FruitSelection = { mango: 0, yogurtMl: 0 };
const INITIAL_VEGETABLE_SELECTION: VegetableSelection = {
  carrot: 0,
  cabbage: 0,
  radish: 0,
  sunflowerOilMl: 0
};

function formatUnit(value: number, unit: 'pcs' | 'ml') {
  return unit === 'ml' ? `${value} мл` : `${value} шт.`;
}

function hasEnoughIngredients(state: KitchenState | null, recipe: typeof FRUIT_RECIPE | typeof VEGETABLE_RECIPE) {
  if (!state) return false;

  for (const [type, amount] of Object.entries(recipe.veg)) {
    if ((state.vegetables[type] ?? 0) < amount) return false;
  }
  if (recipe.liquids.yogurtMl && state.yogurtMl < recipe.liquids.yogurtMl) return false;
  if (recipe.liquids.sunflowerOilMl && state.sunflowerOilMl < recipe.liquids.sunflowerOilMl) return false;

  return true;
}

function isSelectionExact(
  selection: Record<string, number>,
  recipe: typeof FRUIT_RECIPE | typeof VEGETABLE_RECIPE
) {
  for (const [type, amount] of Object.entries(recipe.veg)) {
    if ((selection[type] ?? 0) !== amount) return false;
  }
  if (recipe.liquids.yogurtMl && (selection.yogurtMl ?? 0) !== recipe.liquids.yogurtMl) return false;
  if (
    recipe.liquids.sunflowerOilMl &&
    (selection.sunflowerOilMl ?? 0) !== recipe.liquids.sunflowerOilMl
  ) return false;

  return true;
}

export function KitchenTab({ onToast }: KitchenTabProps) {
  const [state, setState] = React.useState<KitchenState | null>(null);
  const [activeControl, setActiveControl] = React.useState<string | null>(null);
  const [fruitSelection, setFruitSelection] = React.useState<FruitSelection>(INITIAL_FRUIT_SELECTION);
  const [vegetableSelection, setVegetableSelection] = React.useState<VegetableSelection>(INITIAL_VEGETABLE_SELECTION);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [fruitMessage, setFruitMessage] = React.useState<string | null>(null);
  const [vegetableMessage, setVegetableMessage] = React.useState<string | null>(null);


  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<KitchenState>('/kitchen');

     if (!data || typeof data !== 'object') {
      throw new Error('Kitchen payload is empty');
      }

      setState(data);
      setError(null);
    } catch (loadError) {
      console.error('Failed to load kitchen', loadError);
      setState(null);

      setError('Не удалось загрузить кухню');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  React.useEffect(() => {
    if (!state) return;

    setActiveControl(null);
    setFruitSelection({
      mango: Math.min(state.vegetables.mango ?? 0, FRUIT_RECIPE.veg.mango),
      yogurtMl: Math.min(state.yogurtMl, FRUIT_RECIPE.liquids.yogurtMl)
    });
    setVegetableSelection({
      carrot: Math.min(state.vegetables.carrot ?? 0, VEGETABLE_RECIPE.veg.carrot),
      cabbage: Math.min(state.vegetables.cabbage ?? 0, VEGETABLE_RECIPE.veg.cabbage),
      radish: Math.min(state.vegetables.radish ?? 0, VEGETABLE_RECIPE.veg.radish),
      sunflowerOilMl: Math.min(state.sunflowerOilMl, VEGETABLE_RECIPE.liquids.sunflowerOilMl)
    });
    setFruitMessage(null);
    setVegetableMessage(null);
  }, [state]);

  const openControl = (key: string) => {
    setActiveControl((previous) => (previous === key ? null : key));
  };

  const updateFruitSelection = (key: keyof FruitSelection, value: number) => {
    setFruitSelection((previous) => ({ ...previous, [key]: value }));
    setFruitMessage(null);
  };

  const updateVegetableSelection = (key: keyof VegetableSelection, value: number) => {
    setVegetableSelection((previous) => ({ ...previous, [key]: value }));
    setVegetableMessage(null);
  };

  const prepareSalad = async (recipeKey: 'fruit' | 'vegetable') => {
    if (!state) return;

    const definition = recipeKey === 'fruit' ? FRUIT_RECIPE : VEGETABLE_RECIPE;
    const selection = recipeKey === 'fruit' ? fruitSelection : vegetableSelection;

    if (!hasEnoughIngredients(state, definition)) {
      if (recipeKey === 'fruit') setFruitMessage('Недостаточно ингредиентов для фруктового салата');
      else setVegetableMessage('Недостаточно ингредиентов для овощного салата');
      return;
    }

    if (!isSelectionExact(selection, definition)) {
      if (recipeKey === 'fruit') setFruitMessage('Выстави ползунки на нужное количество');
      else setVegetableMessage('Выстави ползунки на нужное количество');
      return;
    }

    try {
      const { data } = await api.post<KitchenState>('/kitchen/salads', {
        recipe: recipeKey,
        ingredients: selection
      });
      setState(data);

       if (recipeKey === 'fruit') setFruitMessage(null);
       else setVegetableMessage(null);
       onToast('Салат готов!');
    } catch (error) {
      console.error('Failed to prepare salad', error);
      onToast('Не удалось приготовить салат');
    }
  };

  if (loading && !state) {
    return <div className="card">Загрузка...</div>;
  }

  if (!state) {
    return <div className="card">{error ?? 'Не удалось загрузить кухню'}</div>;
  }

  return (
    <div className="grid">
      {/* Фруктовый салат */}
      <div className="card kitchen-card">
        <h3>Фруктовый салат</h3>
        <p>Манго ×3 и йогурт ×1 литр.</p>

        <div className="kitchen-ingredients">
          {/* Манго */}
          <button
            type="button"
            className="kitchen-ingredient"
            onClick={() => openControl('fruit.mango')}
          >
            <img src={SEED_ICONS.mango} alt="Манго" />
            <div>
              <div className="kitchen-ingredient-name">{SEED_NAMES.mango}</div>
              <div className="kitchen-ingredient-info">
                Выбрано {formatUnit(fruitSelection.mango, 'pcs')} из {FRUIT_RECIPE.veg.mango}. Доступно{' '}
                {formatUnit(state.vegetables.mango ?? 0, 'pcs')}.
              </div>
            </div>
          </button>
          {activeControl === 'fruit.mango' ? (
            <input
              type="range"
              className="kitchen-slider"
              min={0}
              max={state.vegetables.mango ?? 0}
              step={1}
              value={fruitSelection.mango}
              onChange={(e) => updateFruitSelection('mango', Number(e.target.value))}
            />
          ) : null}

          {/* Йогурт */}
          <button
            type="button"
            className="kitchen-ingredient"
            onClick={() => openControl('fruit.yogurt')}
          >
            <img src={yogurtIcon} alt="Йогурт" />
            <div>
              <div className="kitchen-ingredient-name">Йогурт</div>
              <div className="kitchen-ingredient-info">
                Выбрано {formatUnit(fruitSelection.yogurtMl, 'ml')} из {formatUnit(FRUIT_RECIPE.liquids.yogurtMl, 'ml')}. Доступно{' '}
                {formatUnit(state.yogurtMl, 'ml')}.
              </div>
            </div>
          </button>
          {activeControl === 'fruit.yogurt' ? (
            <input
              type="range"
              className="kitchen-slider"
              min={0}
              max={state.yogurtMl}
              step={50}
              value={fruitSelection.yogurtMl}
              onChange={(e) => updateFruitSelection('yogurtMl', Number(e.target.value))}
            />
          ) : null}
        </div>

        <button className="btn" onClick={() => prepareSalad('fruit')}>
          Приготовить
        </button>
        {fruitMessage ? <div className="kitchen-warning">{fruitMessage}</div> : null}
      </div>

      {/* Овощной салат */}
      <div className="card kitchen-card">
        <h3>Овощной салат</h3>
        <p>Морковь ×3, капуста ×3, редис ×2 и подсолнечное масло ×100 мл.</p>

        <div className="kitchen-ingredients">
          {/* Морковь */}
          <button
            type="button"
            className="kitchen-ingredient"
            onClick={() => openControl('veg.carrot')}
          >
            <img src={SEED_ICONS.carrot} alt="Морковь" />
            <div>
              <div className="kitchen-ingredient-name">{SEED_NAMES.carrot}</div>
              <div className="kitchen-ingredient-info">
                Выбрано {formatUnit(vegetableSelection.carrot, 'pcs')} из {VEGETABLE_RECIPE.veg.carrot}. Доступно{' '}
                {formatUnit(state.vegetables.carrot ?? 0, 'pcs')}.
              </div>
            </div>
          </button>
          {activeControl === 'veg.carrot' ? (
            <input
              type="range"
              className="kitchen-slider"
              min={0}
              max={state.vegetables.carrot ?? 0}
              step={1}
              value={vegetableSelection.carrot}
              onChange={(e) => updateVegetableSelection('carrot', Number(e.target.value))}
            />
          ) : null}

          {/* Капуста */}
          <button
            type="button"
            className="kitchen-ingredient"
            onClick={() => openControl('veg.cabbage')}
          >
            <img src={SEED_ICONS.cabbage} alt="Капуста" />
            <div>
              <div className="kitchen-ingredient-name">{SEED_NAMES.cabbage}</div>
              <div className="kitchen-ingredient-info">
                Выбрано {formatUnit(vegetableSelection.cabbage, 'pcs')} из {VEGETABLE_RECIPE.veg.cabbage}. Доступно{' '}
                {formatUnit(state.vegetables.cabbage ?? 0, 'pcs')}.
              </div>
            </div>
          </button>
          {activeControl === 'veg.cabbage' ? (
            <input
              type="range"
              className="kitchen-slider"
              min={0}
              max={state.vegetables.cabbage ?? 0}
              step={1}
              value={vegetableSelection.cabbage}
              onChange={(e) => updateVegetableSelection('cabbage', Number(e.target.value))}
            />
          ) : null}

          {/* Редис */}
          <button
            type="button"
            className="kitchen-ingredient"
            onClick={() => openControl('veg.radish')}
          >
            <img src={SEED_ICONS.radish} alt="Редис" />
            <div>
              <div className="kitchen-ingredient-name">{SEED_NAMES.radish}</div>
              <div className="kitchen-ingredient-info">
                Выбрано {formatUnit(vegetableSelection.radish, 'pcs')} из {VEGETABLE_RECIPE.veg.radish}. Доступно{' '}
                {formatUnit(state.vegetables.radish ?? 0, 'pcs')}.
              </div>
            </div>
          </button>
          {activeControl === 'veg.radish' ? (
            <input
              type="range"
              className="kitchen-slider"
              min={0}
              max={state.vegetables.radish ?? 0}
              step={1}
              value={vegetableSelection.radish}
              onChange={(e) => updateVegetableSelection('radish', Number(e.target.value))}
            />
          ) : null}

          {/* Масло */}
          <button
            type="button"
            className="kitchen-ingredient"
            onClick={() => openControl('veg.oil')}
          >
            <img src={sunflowerOilIcon} alt="Подсолнечное масло" />
            <div>
              <div className="kitchen-ingredient-name">Подсолнечное масло</div>
              <div className="kitchen-ingredient-info">
                Выбрано {formatUnit(vegetableSelection.sunflowerOilMl, 'ml')} из {formatUnit(VEGETABLE_RECIPE.liquids.sunflowerOilMl, 'ml')}. Доступно{' '}
                {formatUnit(state.sunflowerOilMl, 'ml')}.
              </div>
            </div>
          </button>
          {activeControl === 'veg.oil' ? (
            <input
              type="range"
              className="kitchen-slider"
              min={0}
              max={state.sunflowerOilMl}
              step={10}
              value={vegetableSelection.sunflowerOilMl}
              onChange={(e) => updateVegetableSelection('sunflowerOilMl', Number(e.target.value))}
            />
          ) : null}
        </div>

        <button className="btn" onClick={() => prepareSalad('vegetable')}>
          Приготовить
        </button>
        {vegetableMessage ? <div className="kitchen-warning">{vegetableMessage}</div> : null}
      </div>
    </div>
  );
}

export default KitchenTab;

import radish from '../assets/radish.svg';
import carrot from '../assets/carrot.svg';
import cabbage from '../assets/cabbage.svg';
import mango from '../assets/mango.svg';
import potato from '../assets/potato.svg';
import eggplant from '../assets/eggplant.svg';

export const BASE_SEED_TYPES = ['radish', 'carrot', 'cabbage'] as const;
export const ADVANCED_SEED_TYPES = ['mango', 'potato', 'eggplant'] as const;

export type BaseSeedType = (typeof BASE_SEED_TYPES)[number];
export type AdvancedSeedType = (typeof ADVANCED_SEED_TYPES)[number];
export type SeedType = BaseSeedType | AdvancedSeedType;

export const SEED_NAMES: Record<SeedType, string> = {
  radish: 'Редис',
  carrot: 'Морковь',
  cabbage: 'Капуста',
  mango: 'Манго',
  potato: 'Картофель',
  eggplant: 'Баклажан'
};

export const SEED_ICONS: Record<SeedType, string> = {
  radish,
  carrot,
  cabbage,
  mango,
  potato,
  eggplant
};
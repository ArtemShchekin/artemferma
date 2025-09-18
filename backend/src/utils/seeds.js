export const BASE_SEED_TYPES = ['radish', 'carrot', 'cabbage'];
export const ADVANCED_SEED_TYPES = ['mango', 'potato', 'eggplant'];
export const SEED_TYPES = [...BASE_SEED_TYPES, ...ADVANCED_SEED_TYPES];

export const isAdvancedSeed = (type) => ADVANCED_SEED_TYPES.includes(type);
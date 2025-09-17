
export const SEED_TYPES = ['radish','carrot','cabbage','mango','potato','eggplant'];
export const BASE_TYPES = ['radish','carrot','cabbage'];
export const ADV_TYPES  = ['mango','potato','eggplant'];

export function isAdv(type){ return ADV_TYPES.includes(type); }
export function isBase(type){ return BASE_TYPES.includes(type); }

export function nowUtc(){
  return new Date(new Date().toISOString().replace('Z',''));
}

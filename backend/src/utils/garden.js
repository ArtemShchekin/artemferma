import config from '../config/index.js';

export function hasMatured(plantedAt, now = new Date()) {
  if (!plantedAt) {
    return false;
  }
  const planted = new Date(plantedAt);
  if (Number.isNaN(planted.getTime())) {
    return false;
  }
  const diffMinutes = (now.getTime() - planted.getTime()) / 60000;
  return diffMinutes >= config.garden.growthMinutes;
}
import config from '../config/index.js';

export function buildPricePayload() {
  return {
    purchase: {
      basePrice: config.prices.purchaseBase,
      advPrice: config.prices.purchaseAdv
    },
    sale: {
      basePrice: config.prices.saleBase,
      advPrice: config.prices.saleAdv
    },
    supplies: {
      yogurt: {
        price: config.supplies.yogurt.price,
        volume: config.supplies.yogurt.volume
      },
      sunflowerOil: {
        price: config.supplies.sunflowerOil.price,
        volume: config.supplies.sunflowerOil.volume
      }
    }
  };
}

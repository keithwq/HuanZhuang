import { shopClothingTotal, CLOTHING_ITEMS } from '../src/data/items';
import { shopFurnitureTotal, FURNITURE_ITEMS } from '../src/data/furniture';

const c = shopClothingTotal();
const f = shopFurnitureTotal();
console.log(`clothing shop: ${c} (${CLOTHING_ITEMS.filter(x => x.pool === 'shop').length} 件)`);
console.log(`furniture shop: ${f} (${FURNITURE_ITEMS.filter(x => x.pool === 'shop').length} 件)`);
console.log(`TOTAL: ${c + f}`);

const fs = require('fs');
const file = 'src/context/DatabaseContext.tsx';
let data = fs.readFileSync(file, 'utf8');

// Replace all Unsplash URLs with a random image from our generated set
const localImages = [
  '/images/hero.png',
  '/images/jollof.png',
  '/images/chicken.png',
  '/images/pizza.png',
  '/images/burger.png'
];

let i = 0;
data = data.replace(/https:\/\/images\.unsplash\.com\/[^"']+/g, (match) => {
  const img = localImages[i % localImages.length];
  i++;
  return img;
});

fs.writeFileSync(file, data);
console.log('Replaced unsplash URLs in DatabaseContext.tsx');

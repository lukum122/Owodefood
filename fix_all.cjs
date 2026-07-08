const fs = require('fs');
const path = require('path');

const localImages = [
  '/images/hero.png',
  '/images/jollof.png',
  '/images/chicken.png',
  '/images/pizza.png',
  '/images/burger.png'
];
let imgIndex = 0;

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('images.unsplash.com')) {
        content = content.replace(/https:\/\/images\.unsplash\.com\/[^"']+/g, (match) => {
          const img = localImages[imgIndex % localImages.length];
          imgIndex++;
          return img;
        });
        fs.writeFileSync(fullPath, content);
        console.log('Fixed', fullPath);
      }
    }
  }
}

processDir('src');
console.log('All files processed.');

const fs = require('fs');

let content = fs.readFileSync('src/context/DatabaseContext.tsx', 'utf8');

content = content.replace(
  'interface DatabaseContextType {',
  'interface DatabaseContextType {\n  isDataLoading: boolean;\n  dataLoadError: string | null;\n  configurationVersion: string;'
);

content = content.replace(
  'const [products, setProducts] = useState<Product[]>([]);',
  'const [products, setProducts] = useState<Product[]>([]);\n  const [isDataLoading, setIsDataLoading] = useState(true);\n  const [dataLoadError, setDataLoadError] = useState<string | null>(null);\n  const [configurationVersion, setConfigurationVersion] = useState<string>("1");'
);

content = content.replace(
  /value=\{\{/,
  'value={{\n        isDataLoading,\n        dataLoadError,\n        configurationVersion,'
);

fs.writeFileSync('src/context/DatabaseContext.tsx', content);
console.log('Added states to context');

const path = require('path');
import * as angularUniversal from './express-firebase';
import { provideModuleMap } from '@nguniversal/module-map-ngfactory-loader';
const { LAZY_MODULE_MAP } = require('../../lib/main');

export default angularUniversal.trigger({
  index: path.join(__dirname, '../index-server.html'),
  main: path.join(__dirname, '../main.js'),
  enableProdMode: true,
  cdnCacheExpiry: 1200,
  browserCacheExpiry: 600,
  staleWhileRevalidate: 120,
  staticDirectory: path.join(__dirname, '../'),
  extraProviders: [
    provideModuleMap(LAZY_MODULE_MAP)
  ]
});

// Permite execução direta via "node index.js" utilizando ts-node ou o build compilado
try {
  require('ts-node/register');
  const { app } = require('./src/app');
  module.exports = app;

  if (require.main === module) {
    require('./src/server');
  }
} catch (err) {
  const { app } = require('./dist/app');
  module.exports = app;

  if (require.main === module) {
    require('./dist/server');
  }
}
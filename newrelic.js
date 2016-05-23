'use strict'

exports.config = {
  app_name: [ process.env.NEW_RELIC_APP_NAME || 'local' ],
  license_key: process.env.NEW_RELIC_KEY,
  logging: {
    level: process.env.NEW_RELIC_LEVEL || 'trace'
  }
}

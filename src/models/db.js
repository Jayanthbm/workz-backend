const {
    Pool
} = require('@node-mysql/mysql');
const dbConfig = require('../config/db.config');

const pool = new Pool(dbConfig);

module.exports = pool;
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'serj',
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});


module.exports.pool = pool;

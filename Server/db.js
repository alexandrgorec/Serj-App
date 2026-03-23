require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'serj',
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});


module.exports.pool = pool;

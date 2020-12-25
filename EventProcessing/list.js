'use strict';

const createDBQuery = "CREATE TABLE IF NOT EXISTS events (ID int unsigned NOT NULL auto_increment PRIMARY KEY, source VARCHAR(255) NOT NULL, timestamp int unsigned NOT NULL, message VARCHAR(1000) NOT NULL);"

const mysql = require('serverless-mysql')({
  config: {
    database: process.env.RDS_DB_NAME,
    user: process.env.RDS_USERNAME,
    password: process.env.RDS_PASSWORD,
    host: process.env.RDS_HOST,
    port: process.env.RDS_PORT
  }
});

module.exports.handleList = async (event) => {
  await mysql.query(createDBQuery);

  let result = await mysql.query({
    sql: 'SELECT * FROM events ORDER BY ID DESC;',
    timeout: 10000
  });
  console.log(result);
  await mysql.end();

  return {
    statusCode: 200,
    body: JSON.stringify(result, null, 2),
  };
};

module.exports.handleLatest = async (event) => {
  await mysql.query(createDBQuery);

  let result = await mysql.query({
    sql: 'SELECT * FROM events ORDER BY ID DESC LIMIT 1;',
    timeout: 10000
  });
  console.log(result);
  await mysql.end();

  return {
    statusCode: 200,
    body: JSON.stringify(result, null, 2),
  };
};
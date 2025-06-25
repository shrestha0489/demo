import mysql from "mysql2/promise";
import "dotenv/config";

let connection = null;
async function mySQLCreateConnection() {
  let config = {
    host: process.env.MYSQL_DB_URL,
    user: process.env.MYSQL_DB_USER_NAME,
    password: process.env.MYSQL_DB_PASSWORD,
    database: process.env.MYSQL_DB_NAME,
    port: process.env.MYSQL_DB_PORT,
  };

  if (process.env.NODE_ENV === "test") {
    config = {
      host: "localhost",
      user: "root",
      database: process.env.MYSQL_DB_NAME,
      port: 3306,
    };
  }

  if (connection == null) {
    connection = await mysql.createConnection(config);
    console.debug("Created connection!");
  }
}

export async function mySQLQueryExecuteUsingPromise(
  query,
  values,
  shouldClose = false,
) {
  await mySQLCreateConnection();
  let [results] = [null];
  try {
    const transactionCommands = ['START TRANSACTION', 'COMMIT', 'ROLLBACK'];

    if (transactionCommands.some(cmd => query.toUpperCase().includes(cmd))) {
      [results] = await connection.query(query);
    } else if (query.includes('VALUES ?')) {
      [results] = await connection.query(query, values);
    } else {
      [results] = await connection.execute(query, values);
    }

    if (results["affectedRows"] !== undefined) {
      console.debug(
        `SQL query affected Rows: ${JSON.stringify(results["affectedRows"])}`,
      );
    } else {
      console.debug(`SQL query gets Rows: ${JSON.stringify(results.length)}`);
    }
  } catch (error) {
    console.error("Error:", error);
    return {
      message: error.toString(),
    };
  } finally {
    if (shouldClose) {
      await connection.end();
    }
  }
  return results;
}

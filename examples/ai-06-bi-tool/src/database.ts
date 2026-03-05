import mysql from "mysql2/promise";

let pool: mysql.Pool | null = null;
let readPool: mysql.Pool | null = null;

function parseUpsunRelationship(prefix: string): mysql.PoolOptions | null {
  const host = process.env[`${prefix}_HOST`];
  const port = process.env[`${prefix}_PORT`];
  const user = process.env[`${prefix}_USERNAME`];
  const password = process.env[`${prefix}_PASSWORD`];
  const database = process.env[`${prefix}_PATH`];

  if (!host) return null;

  return {
    host,
    port: port ? Number.parseInt(port, 10) : 3306,
    user: user || "root",
    password: password || "",
    database: database || "main",
    waitForConnections: true,
    connectionLimit: 5,
  };
}

function getLocalConfig(): mysql.PoolOptions {
  return {
    host: process.env.MYSQL_HOST || "127.0.0.1",
    port: Number.parseInt(process.env.MYSQL_PORT || "3306", 10),
    user: process.env.MYSQL_USER || "root",
    password: process.env.MYSQL_PASSWORD || "",
    database: process.env.MYSQL_DATABASE || "bi_tool",
    waitForConnections: true,
    connectionLimit: 5,
  };
}

export function getWritePool(): mysql.Pool {
  if (!pool) {
    const upsunConfig = parseUpsunRelationship("DATABASE");
    const config = upsunConfig || getLocalConfig();
    pool = mysql.createPool(config);
    console.log(`[db] Write pool connected to ${config.host}:${config.port}/${config.database}`);
  }
  return pool;
}

export function getReadPool(): mysql.Pool {
  if (!readPool) {
    const upsunConfig = parseUpsunRelationship("REPORTS");
    const config = upsunConfig || getLocalConfig();
    readPool = mysql.createPool(config);
    console.log(`[db] Read pool connected to ${config.host}:${config.port}/${config.database}`);
  }
  return readPool;
}

export async function queryReadOnly(sql: string): Promise<{ rows: Record<string, unknown>[]; fields: string[] }> {
  const pool = getReadPool();
  const [rows, fields] = await pool.query(sql);
  return {
    rows: rows as Record<string, unknown>[],
    fields: fields.map((f) => f.name),
  };
}

export async function closeAll(): Promise<void> {
  if (pool) await pool.end();
  if (readPool) await readPool.end();
}

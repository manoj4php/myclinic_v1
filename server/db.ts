/*import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";*/

import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";
import dotenv from "dotenv";

//neonConfig.webSocketConstructor = ws;

/*if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}*/

//export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
/*const pool = new Pool({
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "my_database",
  password: process.env.DB_PASSWORD || "password",
  port: parseInt(process.env.DB_PORT || "5432", 10),
});
export const db = drizzle({ client: pool, schema });*/


// Load environment variables from .env file
dotenv.config();

const pool = new Pool({
  user:  "postgres",
  host: "localhost",
  database:  "postgres",
  password:  "welcome123",
  port: 5432,
});

export const db = drizzle({ client: pool, schema });
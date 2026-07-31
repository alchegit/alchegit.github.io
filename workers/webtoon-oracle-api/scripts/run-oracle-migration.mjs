import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import oracledb from "oracledb";

await loadDotEnv(path.resolve(process.cwd(), ".env"));

const migrationPath = process.argv[2] ? path.resolve(process.argv[2]) : "";
if (!migrationPath) {
  console.error("Usage: node scripts/run-oracle-migration.mjs <migration.sql>");
  process.exit(2);
}

const source = await readFile(migrationPath, "utf8");
const commands = parseSqlPlusBlocks(source);
if (!commands.length) throw new Error("migration_has_no_executable_blocks");

const connection = await oracledb.getConnection({
  user: requiredEnv("ORACLE_USER"),
  password: requiredEnv("ORACLE_PASSWORD"),
  connectString: requiredEnv("ORACLE_CONNECT_STRING")
});

try {
  for (const command of commands) {
    if (command === "__COMMIT__") await connection.commit();
    else await connection.execute(command);
  }
  await connection.commit();
  console.log(`Migration complete: ${path.basename(migrationPath)} (${commands.filter((item) => item !== "__COMMIT__").length} blocks)`);
} catch (error) {
  await connection.rollback().catch(() => {});
  throw error;
} finally {
  await connection.close();
}

function parseSqlPlusBlocks(value) {
  const commands = [];
  let buffer = [];
  for (const line of String(value).replace(/^\uFEFF/u, "").split(/\r?\n/u)) {
    const trimmed = line.trim();
    if (/^(?:whenever\s+sqlerror|prompt\b)/iu.test(trimmed)) continue;
    if (!buffer.length && (trimmed === "" || trimmed.startsWith("--"))) continue;
    if (trimmed === "/") {
      const command = buffer.join("\n").trim();
      if (command) commands.push(normalizeCommand(command));
      buffer = [];
      continue;
    }
    if (!buffer.length && /^commit\s*;$/iu.test(trimmed)) {
      commands.push("__COMMIT__");
      continue;
    }
    buffer.push(line);
  }
  const remainder = buffer.join("\n").trim();
  if (remainder) throw new Error("migration_statement_requires_sqlplus_slash_terminator");
  return commands;
}

function normalizeCommand(command) {
  return /^(?:declare|begin)\b/iu.test(command)
    ? command
    : command.replace(/;\s*$/u, "");
}

async function loadDotEnv(filePath) {
  const text = await readFile(filePath, "utf8").catch(() => "");
  for (const line of text.split(/\r?\n/u)) {
    const match = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/u);
    if (!match || process.env[match[1]] !== undefined) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[match[1]] = value;
  }
}

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`missing_environment:${name}`);
  return value;
}

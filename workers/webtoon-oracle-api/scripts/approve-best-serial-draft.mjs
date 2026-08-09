import { readFile } from "node:fs/promises";
import path from "node:path";
import oracledb from "oracledb";
import { createStoryHeavenSerialService } from "../src/serial-service.mjs";

await loadDotEnv(path.resolve(process.cwd(), ".env"));
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
oracledb.fetchAsString = [oracledb.CLOB];

const runId = argumentValue("--run-id");
if (!/^[a-zA-Z0-9-]{3,36}$/u.test(runId)) throw new Error("run_id_required");

const connectionOptions = {
  user: requiredEnv("ORACLE_USER"),
  password: requiredEnv("ORACLE_PASSWORD"),
  connectString: requiredEnv("ORACLE_CONNECT_STRING")
};
const service = createStoryHeavenSerialService({
  withConnection,
  withTransaction,
  clob: (value) => ({ val: String(value ?? ""), type: oracledb.CLOB }),
  clobJson: (value) => ({ val: JSON.stringify(value ?? null), type: oracledb.CLOB })
});

const result = await service.resolveQualityHold(runId, "storyheaven-system-recovery", { action: "approve_best" });
console.log(JSON.stringify(result, null, 2));

async function withConnection(callback) {
  const connection = await oracledb.getConnection(connectionOptions);
  try {
    await connection.execute("alter session set time_zone = '+09:00'");
    return await callback(connection);
  } finally {
    await connection.close();
  }
}

async function withTransaction(callback) {
  const connection = await oracledb.getConnection(connectionOptions);
  try {
    await connection.execute("alter session set time_zone = '+09:00'");
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback().catch(() => {});
    throw error;
  } finally {
    await connection.close();
  }
}

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? String(process.argv[index + 1] || "").trim() : "";
}

async function loadDotEnv(filePath) {
  const text = await readFile(filePath, "utf8").catch(() => "");
  for (const line of text.split(/\r?\n/u)) {
    const match = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/u);
    if (!match || process.env[match[1]] !== undefined) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    process.env[match[1]] = value;
  }
}

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`missing_environment:${name}`);
  return value;
}

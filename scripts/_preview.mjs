/*
 * Reinicia el preview de OpenNext con las credenciales correctas (token),
 * para que D1 remoto funcione y se pueda reproducir el 500 de producción
 * con logs completos de workerd.
 */
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";

const secrets = {};
for (const line of readFileSync("C:/Users/VIP/Documents/prz-secrets/tokens.env", "utf8").split("\n")) {
  const m = line.trim().match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !line.trim().startsWith("#") && m[2].trim()) secrets[m[1]] = m[2].trim();
}

console.log("keys:", Object.keys(secrets).join(","));
const child = spawn("npx.cmd", ["opennextjs-cloudflare", "preview"], {
  env: { ...process.env, ...secrets },
  stdio: "inherit",
  shell: true,
});
child.on("exit", (c) => process.exit(c ?? 0));

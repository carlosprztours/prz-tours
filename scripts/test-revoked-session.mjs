// Run against a local app with AUTH_SECRET and an isolated, migrated D1.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { SignJWT } from "jose";

const origin = new URL(process.argv[2] ?? "http://localhost:3000");
assert.ok(["localhost", "127.0.0.1"].includes(origin.hostname));
assert.ok(process.env.AUTH_SECRET?.length >= 32);

const token = await new SignJWT({ uid: 1, role: "admin", sid: randomUUID() })
  .setProtectedHeader({ alg: "HS256" })
  .setExpirationTime("5m")
  .sign(new TextEncoder().encode(process.env.AUTH_SECRET));
const headers = { cookie: `prz_session=${token}` };

for (const route of ["login", "signup"]) {
  const response = await fetch(new URL(`/es/${route}`, origin), {
    headers,
    redirect: "manual",
  });
  assert.equal(response.status, 200, `A missing session row must allow /es/${route}`);
}

const response = await fetch(new URL("/es/admin", origin), {
  headers,
  redirect: "manual",
});
assert.ok([303, 307, 308].includes(response.status));
const clearUrl = new URL(response.headers.get("location"), origin);
assert.equal(clearUrl.origin, origin.origin);
assert.equal(clearUrl.pathname, "/api/auth/clear");
const clear = await fetch(clearUrl, { headers, redirect: "manual" });
assert.match(clear.headers.get("set-cookie") ?? "", /^prz_session=;.*Path=\//i);
assert.equal(new URL(clear.headers.get("location"), origin).pathname, "/es/login");

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

let url = new URL("/es/admin", origin);
let cookie = headers.cookie;
for (let hop = 0; hop < 4; hop++) {
  const response = await fetch(url, {
    headers: { cookie },
    redirect: "manual",
  });
  if (response.status === 200) {
    assert.equal(url.pathname, "/es/login");
    assert.match(await response.text(), /type="password"/);
    console.log("Revoked session reached a functional login without a redirect loop");
    process.exit(0);
  }
  assert.ok([303, 307, 308].includes(response.status));
  if (response.headers.getSetCookie().some((value) => /^prz_session=;/.test(value))) {
    cookie = "";
  }
  const location = response.headers.get("location");
  assert.ok(location);
  url = new URL(location, origin);
  assert.equal(url.origin, origin.origin);
}
assert.fail("Revoked session did not reach login within four requests");

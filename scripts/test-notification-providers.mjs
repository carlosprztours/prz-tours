import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { test } from "node:test";

const moduleUrl = (source) => "data:text/javascript," + encodeURIComponent(source);
const loader = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") return { url: moduleUrl(""), shortCircuit: true };
    if (specifier === "@/lib/db/client") {
      return { url: moduleUrl("export const getEnvVar = async key => globalThis.qaProviderEnv[key];"), shortCircuit: true };
    }
    if (specifier === "@/lib/db/content") {
      return { url: moduleUrl("export const getSetting = async () => null;"), shortCircuit: true };
    }
    if (specifier === "@/lib/site") {
      return { url: moduleUrl("export const DEFAULT_PHONE_DISPLAY = '';"), shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
});
const { sendEmail } = await import("../src/lib/notify/email.ts");
const { exchangeGoogleCode, fetchGoogleProfile, googleAuthUrl } = await import("../src/lib/auth/google.ts");
loader.deregister();

test("Resend missing configuration, rejection, network failure and accepted message", async (t) => {
  globalThis.qaProviderEnv = {};
  const payload = { to: "qa@example.test", subject: "QA", html: "<p>QA</p>", copyToInternal: false };
  const send = t.mock.method(globalThis, "fetch", async () => { throw new Error("offline"); });
  assert.deepEqual(await sendEmail(payload), { sent: false, skipped: "missing-config" });
  assert.equal(send.mock.callCount(), 0);
  globalThis.qaProviderEnv = { RESEND_API_TOKEN: "synthetic-token", RESEND_FROM: "from@example.test" };
  assert.deepEqual(await sendEmail(payload), { sent: false, skipped: "resend-network" });
  send.mock.mockImplementation(async () => new Response("rejected", { status: 429 }));
  assert.deepEqual(await sendEmail(payload), { sent: false, skipped: "resend-429" });
  send.mock.mockImplementation(async (url, init) => {
    assert.equal(url, "https://api.resend.com/emails");
    assert.deepEqual(JSON.parse(init.body).to, ["qa@example.test"]);
    return Response.json({ id: "qa-accepted" });
  });
  assert.deepEqual(await sendEmail(payload), { sent: true, id: "qa-accepted" });
  assert.equal(send.mock.callCount(), 3);
});

test("Google OAuth preserves state, rejects provider errors and requires a verified email", async (t) => {
  const callback = "https://qa.example.test/api/auth/google/callback";
  const start = new URL(googleAuthUrl("qa-client", callback, "qa-state"));
  assert.equal(start.searchParams.get("state"), "qa-state");
  assert.equal(start.searchParams.get("redirect_uri"), callback);
  const request = t.mock.method(globalThis, "fetch", async () => new Response("", { status: 400 }));
  assert.equal(await exchangeGoogleCode("qa-client", "qa-secret", "qa-code", callback), null);
  request.mock.mockImplementation(async () => Response.json({ sub: "qa", email: "QA@example.test", email_verified: false }));
  assert.equal(await fetchGoogleProfile("qa-token"), null);
  request.mock.mockImplementation(async () => Response.json({ sub: "qa", email: "QA@example.test", email_verified: true }));
  assert.equal((await fetchGoogleProfile("qa-token")).email, "qa@example.test");
});

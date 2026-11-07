import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { runInNewContext } from "node:vm";

const script = readFileSync("public/sw.js", "utf8");
function worker() {
  const listeners = new Map();
  const deleted = [];
  const precached = [];
  const notifications = [];
  const messages = [];
  const offlineHome = new Response("anonymous home");
  runInNewContext(script, {
    URL, Response,
    Request: class { constructor(url, options) { Object.assign(this, { url }, options); } },
    fetch: async () => { throw new Error("offline"); },
    caches: {
      open: async () => ({ add: async (request) => precached.push(request) }),
      keys: async () => ["prz-v1-pages", "prz-v1-static", "prz-v2-pages", "unrelated"],
      delete: async (key) => deleted.push(key),
      match: async (url, options) => url === "/en" && options.cacheName === "prz-v2-pages" ? offlineHome : undefined,
    },
    self: {
      location: { origin: "https://qa.example.test" },
      skipWaiting: async () => {},
      registration: { showNotification: async (...args) => notifications.push(args) },
      clients: { claim: async () => {}, matchAll: async () => [{ postMessage: (msg) => messages.push(msg) }] },
      addEventListener: (name, callback) => listeners.set(name, callback),
    },
  });
  function dispatch(type, props) {
    let result;
    listeners.get(type)({ ...props, waitUntil: (value) => { result = value; }, respondWith: (value) => { result = value; } });
    return result;
  }
  return { dispatch, deleted, precached, notifications, messages };
}

test("upgrade evicts old page caches and only precaches anonymous HTML", async () => {
  const { dispatch, deleted, precached } = worker();
  await dispatch("install");
  await dispatch("activate");
  assert.deepEqual(deleted, ["prz-v1-pages", "prz-v1-static"]);
  assert.equal(precached.length, 1);
  assert.equal(precached[0].credentials, "omit");
});

test("offline fallback is public and bypasses private navigation, RSC, and API", async () => {
  const { dispatch } = worker();
  const navigate = (path, mode = "navigate") => dispatch("fetch", {
    request: { method: "GET", mode, url: "https://qa.example.test" + path },
  });
  for (const path of ["/es/account", "/en/admin", "/es/book", "/en/track", "/api/auth/google"]) {
    assert.equal(navigate(path), undefined, path);
  }
  assert.equal(navigate("/en/tours", "cors"), undefined);
  assert.equal(await (await navigate("/es/gallery")).text(), "anonymous home");
});

test("isolated push event produces a notification and informs the open client", async () => {
  const { dispatch, notifications, messages } = worker();
  const payload = { title: "QA", body: "Isolated test", url: "/en/account", lang: "en" };
  await dispatch("push", { data: { json: () => payload } });
  assert.equal(notifications[0][0], "QA");
  assert.equal(notifications[0][1].data.url, "/en/account");
  assert.equal(messages[0].type, "prz-push");
  assert.equal(messages[0].payload, payload);
});

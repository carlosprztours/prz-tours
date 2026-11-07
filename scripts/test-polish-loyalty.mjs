import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const db = new DatabaseSync(":memory:");
for (const migration of readdirSync("migrations").filter((name) => name.endsWith(".sql")).sort()) {
  db.exec(readFileSync(`migrations/${migration}`, "utf8"));
}
db.exec(`INSERT INTO users (id,email,name,password_hash) VALUES
  (1,'qa1@example.test','QA One','unused'),(2,'qa2@example.test','QA Two','unused');
  INSERT INTO coupons (id,code,user_id,expires_at) VALUES
  (1,'QA-PERSONAL',1,'2099-01-01'),(2,'QA-EXPIRED',1,'2001-01-01');`);
const source = readFileSync("src/lib/db/bookings.ts", "utf8");
const insert = source.match(/const insert = \`(INSERT INTO bookings[\s\S]*?)\`;/)[1];
const guard = source.match(/sql: \`\$\{insert\}( WHERE EXISTS \([\s\S]*?\))\`/)[1];
const consume = source.match(/sql: \`(UPDATE coupons SET status = 'used'[\s\S]*?)\`/)[1];
const booking = db.prepare(insert + guard);
const coupon = db.prepare(consume);
function redeem(reference, user, couponId) {
  const values = [
    reference, "custom", null, null, "", null, null, user, "QA",
    `qa${user}@example.test`, "555-0101", null, 1, 100, 90, "USD",
    "QA-PERSONAL", 10, 0, null, null, null, null, null, null, null,
    "es", null, "web", null,
  ];
  db.exec("BEGIN");
  try {
    const inserted = booking.run(...values, couponId, user).changes;
    const consumed = coupon.run(reference, couponId, user, reference, user).changes;
    assert.equal(inserted, consumed);
    db.exec("COMMIT");
    return inserted;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
assert.equal(redeem("QA-OTHER", 2, 1), 0);
assert.equal(redeem("QA-EXPIRED", 1, 2), 0);
assert.equal(redeem("QA-USED", 1, 1), 1);
assert.equal(redeem("QA-REPLAY", 1, 1), 0);
assert.equal(db.prepare("SELECT count(*) n FROM bookings").get().n, 1);
assert.equal(db.prepare("SELECT status FROM coupons WHERE id=1").get().status, "used");
assert.equal(db.prepare("SELECT booking_id FROM coupons WHERE id=1").get().booking_id, 1);
console.log("PASS: personal coupon ownership, expiry, atomic booking and replay rejection");

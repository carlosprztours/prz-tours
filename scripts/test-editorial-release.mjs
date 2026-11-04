import assert from "node:assert/strict";
import { test } from "node:test";
import { existingPickupNote, publishReviewedTourEnglish, reviewToken } from "../src/lib/tour-editorial-review.ts";

test("preserves both legacy pickup notes for tours with manual English", () => {
  for (const note of ["Nota de recogida de prueba A", "Nota de recogida de prueba B"]) {
    assert.equal(existingPickupNote("es", true, note), note);
    assert.equal(existingPickupNote("en", true, note), note);
    assert.equal(existingPickupNote("en", false, note), null);
  }
});

test("publishes nonsensitive fields while withholding unapproved sensitive fields", () => {
  const source = ["Tour", "Resumen", "Condiciones", "", "", "Equipo", "", "", "Recogida"];
  const english = ["Tour", "Summary", "Terms", "", "", "Equipment", "", "", "Pickup"];
  const approvals = [];
  assert.equal(publishReviewedTourEnglish(source, english, approvals)[1], "Summary");
  assert.equal(publishReviewedTourEnglish(source, english, approvals)[2], "");
  approvals[2] = reviewToken(source, english, 2);
  approvals[8] = reviewToken(source, english, 8);
  assert.equal(publishReviewedTourEnglish(source, english, approvals)[8], "Pickup");
  source[8] = "Recogida modificada";
  assert.equal(publishReviewedTourEnglish(source, english, approvals)[8], "");
  assert.equal(publishReviewedTourEnglish(source, english, approvals)[2], "Terms");
  english[2] = "Different terms";
  assert.equal(publishReviewedTourEnglish(source, english, approvals)[2], "");
});

import assert from "node:assert/strict";
import { test } from "node:test";
import { customerReturnTo } from "../src/lib/customer-return";

test("customer sign-in returns to the selected public departure", () => {
  assert.equal(customerReturnTo("/tours/river-tour#departure-12"), "/tours/river-tour?reserve=12#departure-12");
  assert.equal(customerReturnTo("/tours/river-tour?next=/admin#unrelated"), "/tours/river-tour");
});

test("customer sign-in rejects external redirects and admin destinations", () => {
  for (const value of [undefined, "/admin", "//other.example/tours/river", "/\\other.example/tours/river", "https://other.example/tours/river"]) {
    assert.equal(customerReturnTo(value), "/account/bookings");
  }
});

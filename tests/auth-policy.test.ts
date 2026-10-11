import assert from "node:assert/strict";
import { test } from "node:test";
import { isAllowedAdmin, isSameOrigin } from "../src/lib/auth-policy";

test("admin access fails closed and requires the exact immutable provider ID", () => {
  assert.equal(isAllowedAdmin("123", undefined), false);
  assert.equal(isAllowedAdmin(undefined, "123"), false);
  assert.equal(isAllowedAdmin(123, "123"), false);
  assert.equal(isAllowedAdmin("123", " 123,456 "), true);
  assert.equal(isAllowedAdmin("12", "123,456"), false);
  assert.equal(isAllowedAdmin("rrezwan7", "rrezwan7"), false);
  assert.equal(isAllowedAdmin("123", "456"), false); // revoked ID
});

test("admin writes require the configured site's exact origin", () => {
  const request = (origin?: string) => new Request("https://unmukto.example/api/tours", {
    headers: origin ? { origin } : {},
  });
  assert.equal(isSameOrigin(request("https://unmukto.example")), true);
  assert.equal(isSameOrigin(request()), false);
  assert.equal(isSameOrigin(request("null")), false);
  assert.equal(isSameOrigin(request("https://evil.example")), false);
  assert.equal(isSameOrigin(request("http://unmukto.example")), false);
  assert.equal(isSameOrigin(request("https://unmukto.example:8443")), false);
  assert.equal(isSameOrigin(request("https://unmukto.example"), "https://other.example"), false);
  assert.equal(isSameOrigin(request("https://unmukto.example"), "invalid"), false);
});

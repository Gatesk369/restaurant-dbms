import { describe, expect, it } from "vitest";

import { demoCredentials, demoUsername } from "~/lib/demo";
import { CREDENTIALS_ERROR, canSignIn } from "~/lib/validation";

describe("canSignIn", () => {
  it("needs a username and a password of at least 4 characters", () => {
    expect(canSignIn("nakato.sarah", "secret123")).toBe(true);
    expect(canSignIn("u", "abcd")).toBe(true);
    expect(canSignIn("u", "abc")).toBe(false);
    expect(canSignIn("", "secret123")).toBe(false);
    expect(canSignIn("   ", "secret123")).toBe(false);
  });

  it("uses the mock-up wording", () => {
    expect(CREDENTIALS_ERROR).toBe(
      "Error: enter your username and a password of at least 4 characters.",
    );
  });
});

describe("demo prefill", () => {
  it("does nothing unless enabled", () => {
    expect(demoUsername("cashier", false)).toBeNull();
    expect(demoCredentials("manager", false, "x")).toBeNull();
  });

  it("maps each role to a seeded development account", () => {
    expect(demoUsername("cashier", true)).toBe("demo_amina");
    expect(demoUsername("wait_staff", true)).toBe("demo_faridah");
    expect(demoUsername("kitchen", true)).toBe("demo_kevin");
    expect(demoUsername("manager", true)).toBe("demo_sarah");
    expect(demoCredentials("kitchen", true, "pw")).toEqual({
      username: "demo_kevin",
      password: "pw",
    });
  });
});

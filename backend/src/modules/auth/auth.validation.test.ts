import { passwordSchema } from "@/modules/auth/auth.validation";

describe("passwordSchema", () => {
  it("accepts a password that is long enough with no spaces or restricted symbols", () => {
    expect(passwordSchema.safeParse("GoodPassword123!").success).toBe(true);
  });

  it("rejects passwords shorter than 9 characters", () => {
    const result = passwordSchema.safeParse("Short1!");
    expect(result.success).toBe(false);
  });

  it("rejects passwords containing a space", () => {
    const result = passwordSchema.safeParse("has a space");
    expect(result.success).toBe(false);
  });

  it("rejects passwords containing a restricted symbol", () => {
    const result = passwordSchema.safeParse("Password123<script>");
    expect(result.success).toBe(false);
  });
});

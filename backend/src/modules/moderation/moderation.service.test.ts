import { isNsfw } from "@/modules/moderation/moderation.service";

describe("isNsfw", () => {
  it("flags text containing profanity", () => {
    expect(isNsfw("this is a fucking disaster")).toBe(true);
  });

  it("does not flag ordinary recipe comments", () => {
    expect(isNsfw("This recipe was absolutely delicious, thank you!")).toBe(false);
  });
});

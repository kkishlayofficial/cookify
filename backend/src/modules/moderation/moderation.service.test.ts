import { isNsfw } from "@/modules/moderation/moderation.service";

describe("isNsfw", () => {
  it("flags text containing profanity", () => {
    expect(isNsfw("this is a fucking disaster")).toBe(true);
  });

  it("does not flag ordinary recipe comments", () => {
    expect(isNsfw("This recipe was absolutely delicious, thank you!")).toBe(false);
  });

  it("flags inflected/compound forms of profanity, not just exact dictionary words", () => {
    expect(
      isNsfw(
        "This Dish was motherfucking delicious. After eating it i was shitting blood for 4 days straight.",
      ),
    ).toBe(true);
    expect(isNsfw("stop fucking around")).toBe(true);
    expect(isNsfw("what a shitter of a day")).toBe(true);
  });

  it("does not flag cooking vocabulary that merely contains a bad word as a substring", () => {
    expect(isNsfw("I added a teaspoon of cumin and some grape juice")).toBe(false);
    expect(isNsfw("This is a classic cocktail recipe")).toBe(false);
    expect(isNsfw("Lentil soup with a hint of cinnamon")).toBe(false);
  });
});

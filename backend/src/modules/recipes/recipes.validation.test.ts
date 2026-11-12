import { searchRecipesSchema } from "@/modules/recipes/recipes.validation";

describe("searchRecipesSchema", () => {
  it("wraps a single repeated query param into an array", () => {
    const result = searchRecipesSchema.parse({ ingredients: "paneer" });
    expect(result.ingredients).toEqual(["paneer"]);
  });

  it("keeps multiple repeated query params as an array", () => {
    const result = searchRecipesSchema.parse({ ingredients: ["paneer", "tomato"] });
    expect(result.ingredients).toEqual(["paneer", "tomato"]);
  });

  it("applies sort/page/pageSize defaults when omitted", () => {
    const result = searchRecipesSchema.parse({});
    expect(result.sort).toBe("newest");
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
  });
});

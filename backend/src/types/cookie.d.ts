// The installed `cookie` package (v2) ships its own types, but only under a
// package.json `exports` map that classic "Node" module resolution (used
// here for broader ts-jest/Prisma runtime compatibility) can't follow. This
// is a minimal ambient declaration for the one function we use.
declare module "cookie" {
  export function parseCookie(str: string): Record<string, string | undefined>;
}

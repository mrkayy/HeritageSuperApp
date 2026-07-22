module.exports = {
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint", "boundaries"],
  settings: {
    "boundaries/elements": [
      { type: "feature", pattern: "src/features/*" },
      { type: "shared", pattern: "src/shared/*" },
      { type: "app", pattern: "src/{App,routes,main}.tsx" },
    ],
  },
  rules: {
    "boundaries/element-types": [
      2,
      {
        default: "disallow",
        rules: [
          { from: "feature", allow: ["shared"] },
          { from: "shared", allow: ["shared"] },
          { from: "app", allow: ["feature", "shared"] },
        ],
      },
    ],
  },
};

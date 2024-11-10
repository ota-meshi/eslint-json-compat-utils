import { defineBuildConfig } from "unbuild";

export default defineBuildConfig({
  externals: ["eslint"],
  hooks: {
    "rollup:options"(_ctx, options) {
      for (const output of [options.output].flat()) {
        if (output!.format === "cjs") {
          output!.exports = "named";
        }
      }
    },
  },
  failOnWarn: false,
  rollup: {
    esbuild: { target: "es2019" },
  },
});

import assert from "assert";
import json from "@eslint/json";
import { toCompatCreate } from "../../src/to-compat-create";

import { ESLint, type Rule } from "eslint";
import type { AST } from "jsonc-eslint-parser";

describe("toCompatCreate", () => {
  it("The result of lintText should match expectations.", async () => {
    const eslint = new ESLint({
      overrideConfig: {
        plugins: {
          json,
          test: {
            rules: {
              test: {
                create: toCompatCreate((context: Rule.RuleContext) => {
                  return {
                    JSONArrayExpression(node: AST.JSONArrayExpression) {
                      context.report({ node: node as any, message: "Foo" });
                    },
                  };
                }),
              },
            },
          },
        } as any,
        language: "json/jsonc",
        rules: {
          "test/test": "error",
        },
      },
      overrideConfigFile: true,
    });
    const [result] = await eslint.lintText("[1,2,3]");

    assert.deepStrictEqual(
      result.messages.map((m) => ({ message: m.message, ruleId: m.ruleId })),
      [
        {
          message: "Foo",
          ruleId: "test/test",
        },
      ],
    );
  });
});

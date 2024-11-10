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
                      context.report({
                        loc: node.loc,
                        message: node?.type,
                      });
                    },
                    JSONObjectExpression(node: AST.JSONObjectExpression) {
                      const token = context.sourceCode.getFirstToken(
                        node as any,
                      )!;
                      context.report({
                        loc: token.loc,
                        message: token?.value,
                      });
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
    const [result] = await eslint.lintText("[1,{}]");

    assert.deepStrictEqual(
      result.messages.map((m) => ({
        message: m.message,
      })),
      [
        {
          message: "JSONArrayExpression",
        },
        {
          message: "{",
        },
      ],
    );
  });
});

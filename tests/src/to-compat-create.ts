import assert from "assert";
import json from "@eslint/json";
import { toCompatCreate } from "../../src/to-compat-create";
import { ESLint, type Rule } from "eslint";
import type { AST } from "jsonc-eslint-parser";
import * as jsoncParser from "jsonc-eslint-parser";

async function lintWithRule(
  baseRule: { create: (context: Rule.RuleContext) => object },
  code: string,
) {
  const rule = {
    ...baseRule,
    create: toCompatCreate(baseRule.create),
  };
  const plugin = {
    rules: {
      test: rule,
    },
  };
  const eslint1 = new ESLint({
    overrideConfig: {
      plugins: {
        test: plugin,
      } as any,
      languageOptions: {
        parser: jsoncParser,
      },
      rules: {
        "test/test": "error",
      },
    },
    overrideConfigFile: true,
  });
  const [result1] = await eslint1.lintText(code);
  const eslint2 = new ESLint({
    overrideConfig: {
      plugins: {
        json,
        test: plugin,
      } as any,
      language: "json/json5",
      rules: {
        "test/test": "error",
      },
    },
    overrideConfigFile: true,
  });
  const [result] = await eslint2.lintText(code);
  assert.deepStrictEqual(result1.messages, result.messages);
  return result;
}

describe("toCompatCreate", () => {
  it("The result of lintText should match expectations.", async () => {
    const result = await lintWithRule(
      {
        create: (context: Rule.RuleContext) => {
          return {
            Program(node: AST.JSONProgram) {
              const expr = node.body[0].expression;
              context.report({
                loc: expr.loc,
                message: `${JSON.stringify({
                  type: expr.type,
                })} on Program`,
              });
            },
            JSONArrayExpression(node: AST.JSONArrayExpression) {
              context.report({
                loc: node.loc,
                message: `${JSON.stringify({
                  type: node.type,
                  elements: node.elements.map((e) => e?.type),
                  parent: node.parent?.type,
                })} on JSONArrayExpression`,
              });
            },
            JSONObjectExpression(node: AST.JSONObjectExpression) {
              context.report({
                loc: node.loc,
                message: `${JSON.stringify({
                  type: node.type,
                  properties: node.properties.map((e) => e.type),
                  parent: node.parent?.type,
                })} on JSONObjectExpression`,
              });
              const token = context.sourceCode.getFirstToken(node as any)!;
              context.report({
                loc: token.loc,
                message: `FirstToken is ${JSON.stringify({ value: token.value })} on JSONObjectExpression`,
              });
            },
          };
        },
      },
      "[1,{}]",
    );

    assert.deepStrictEqual(
      result.messages.map((m) => m.message),
      [
        '{"type":"JSONArrayExpression"} on Program',
        '{"type":"JSONArrayExpression","elements":["JSONLiteral","JSONObjectExpression"],"parent":"JSONExpressionStatement"} on JSONArrayExpression',
        '{"type":"JSONObjectExpression","properties":[],"parent":"JSONArrayExpression"} on JSONObjectExpression',
        'FirstToken is {"value":"{"} on JSONObjectExpression',
      ],
    );
  });

  it("should listen to the JSONExpressionStatement correctly.", async () => {
    const result = await lintWithRule(
      {
        create: (context: Rule.RuleContext) => {
          return {
            JSONExpressionStatement(node: AST.JSONExpressionStatement) {
              context.report({
                loc: node.loc,
                message: `${node.type} on JSONExpressionStatement`,
              });
            },
          };
        },
      },
      "[1,{}]",
    );

    assert.deepStrictEqual(
      result.messages.map((m) => m.message),
      ["JSONExpressionStatement on JSONExpressionStatement"],
    );
  });

  it("should listen to the * selector correctly.", async () => {
    const result = await lintWithRule(
      {
        create: (context: Rule.RuleContext) => {
          return {
            "*"(node: AST.JSONNode) {
              context.report({
                loc: node.loc,
                message: `${node.type} on *`,
              });
            },
          };
        },
      },
      "[1,{}]",
    );

    assert.deepStrictEqual(
      result.messages.map((m) => m.message),
      [
        "Program on *",
        "JSONExpressionStatement on *",
        "JSONArrayExpression on *",
        "JSONLiteral on *",
        "JSONObjectExpression on *",
      ],
    );
  });

  it("should listen to the JSON values correctly.", async () => {
    const result = await lintWithRule(
      {
        create: (context: Rule.RuleContext) => {
          return {
            JSONLiteral(node: AST.JSONLiteral) {
              context.report({
                loc: node.loc,
                message: `${JSON.stringify({
                  value: node.value,
                  raw: node.raw,
                  parent: node.parent?.type,
                })} on JSONLiteral`,
              });
            },
            JSONIdentifier(node: AST.JSONIdentifier) {
              context.report({
                loc: node.loc,
                message: `${JSON.stringify({
                  name: node.name,
                  parent: node.parent?.type,
                })} on JSONIdentifier`,
              });
            },
          };
        },
      },
      '[1,"String",null,true,false,NaN,Infinity]',
    );

    assert.deepStrictEqual(
      result.messages.map((m) => m.message),
      [
        '{"value":1,"raw":"1","parent":"JSONArrayExpression"} on JSONLiteral',
        '{"value":"String","raw":"\\"String\\"","parent":"JSONArrayExpression"} on JSONLiteral',
        '{"value":null,"raw":"null","parent":"JSONArrayExpression"} on JSONLiteral',
        '{"value":true,"raw":"true","parent":"JSONArrayExpression"} on JSONLiteral',
        '{"value":false,"raw":"false","parent":"JSONArrayExpression"} on JSONLiteral',
        '{"name":"NaN","parent":"JSONArrayExpression"} on JSONIdentifier',
        '{"name":"Infinity","parent":"JSONArrayExpression"} on JSONIdentifier',
      ],
    );
  });

  it("should listen to the JSON singed values correctly.", async () => {
    const result = await lintWithRule(
      {
        create: (context: Rule.RuleContext) => {
          return {
            JSONUnaryExpression(node: AST.JSONUnaryExpression) {
              context.report({
                loc: node.loc,
                message: `${JSON.stringify({
                  operator: node.operator,
                  value: node.argument.type,
                  parent: node.parent?.type,
                })} on JSONUnaryExpression`,
              });
            },
            JSONLiteral(node: AST.JSONLiteral) {
              context.report({
                loc: node.loc,
                message: `${JSON.stringify({
                  value: node.value,
                  raw: node.raw,
                  parent: node.parent?.type,
                })} on JSONLiteral`,
              });
            },
            JSONIdentifier(node: AST.JSONIdentifier) {
              context.report({
                loc: node.loc,
                message: `${JSON.stringify({
                  name: node.name,
                  parent: node.parent?.type,
                })} on JSONIdentifier`,
              });
            },
          };
        },
      },
      "[-2,+3,-NaN,+NaN,+Infinity,-Infinity]",
    );

    assert.deepStrictEqual(
      result.messages.map((m) => m.message),
      [
        '{"operator":"-","value":"JSONLiteral","parent":"JSONArrayExpression"} on JSONUnaryExpression',
        '{"value":2,"raw":"2","parent":"JSONUnaryExpression"} on JSONLiteral',
        '{"operator":"+","value":"JSONLiteral","parent":"JSONArrayExpression"} on JSONUnaryExpression',
        '{"value":3,"raw":"3","parent":"JSONUnaryExpression"} on JSONLiteral',
        '{"operator":"-","value":"JSONIdentifier","parent":"JSONArrayExpression"} on JSONUnaryExpression',
        '{"name":"NaN","parent":"JSONUnaryExpression"} on JSONIdentifier',
        '{"operator":"+","value":"JSONIdentifier","parent":"JSONArrayExpression"} on JSONUnaryExpression',
        '{"name":"NaN","parent":"JSONUnaryExpression"} on JSONIdentifier',
        '{"operator":"+","value":"JSONIdentifier","parent":"JSONArrayExpression"} on JSONUnaryExpression',
        '{"name":"Infinity","parent":"JSONUnaryExpression"} on JSONIdentifier',
        '{"operator":"-","value":"JSONIdentifier","parent":"JSONArrayExpression"} on JSONUnaryExpression',
        '{"name":"Infinity","parent":"JSONUnaryExpression"} on JSONIdentifier',
      ],
    );
  });

  it("should listen to the JSON/JSON5 properties correctly.", async () => {
    const result = await lintWithRule(
      {
        create: (context: Rule.RuleContext) => {
          return {
            JSONProperty(node: AST.JSONProperty) {
              context.report({
                loc: node.loc,
                message: `${JSON.stringify({
                  key: {
                    type: node.key.type,
                    value:
                      node.key.type === "JSONLiteral"
                        ? node.key.value
                        : undefined,
                    name:
                      node.key.type === "JSONIdentifier"
                        ? node.key.name
                        : undefined,
                  },
                  value: {
                    type: node.value.type,
                    value:
                      node.value.type === "JSONLiteral"
                        ? node.value.value
                        : undefined,
                  },
                  parent: node.parent?.type,
                })} on JSONProperty`,
              });
            },
            JSONIdentifier(node: AST.JSONIdentifier) {
              context.report({
                loc: node.loc,
                message: `${JSON.stringify({
                  name: node.name,
                  parent: node.parent?.type,
                })} on JSONIdentifier`,
              });
            },
          };
        },
      },
      `{"a": "b", 'c': 'd', e: "f"}`,
    );

    assert.deepStrictEqual(
      result.messages.map((m) => m.message),
      [
        '{"key":{"type":"JSONLiteral","value":"a"},"value":{"type":"JSONLiteral","value":"b"},"parent":"JSONObjectExpression"} on JSONProperty',
        '{"key":{"type":"JSONLiteral","value":"c"},"value":{"type":"JSONLiteral","value":"d"},"parent":"JSONObjectExpression"} on JSONProperty',
        '{"key":{"type":"JSONIdentifier","name":"e"},"value":{"type":"JSONLiteral","value":"f"},"parent":"JSONObjectExpression"} on JSONProperty',
        '{"name":"e","parent":"JSONProperty"} on JSONIdentifier',
      ],
    );
  });

  it("should listen to the * selector correctly.", async () => {
    const result = await lintWithRule(
      {
        create: (context: Rule.RuleContext) => {
          return {
            "*.elements"(node: AST.JSONNode) {
              context.report({
                loc: node.loc,
                message: `${node.type} on *.elements`,
              });
            },
          };
        },
      },
      `[
         1,
         {},
         [ 2, 3 ]
       ]`,
    );

    assert.deepStrictEqual(
      result.messages.map((m) => m.message),
      [
        "JSONLiteral on *.elements",
        "JSONObjectExpression on *.elements",
        "JSONArrayExpression on *.elements",
        "JSONLiteral on *.elements",
        "JSONLiteral on *.elements",
      ],
    );
  });
});

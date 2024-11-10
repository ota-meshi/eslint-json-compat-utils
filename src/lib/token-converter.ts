import type { AST } from "jsonc-eslint-parser";
import type { MomoaDocument, MomoaToken } from "./momoa";
import type { JSONSourceCode } from "@eslint/json";
import { convertSourceLocationFromJsonToJsonc } from "./location-converter";

type Token = AST.JSONProgram["tokens"][number];
type Comment = AST.JSONProgram["comments"][number];
type JSONToken = Token | Comment;
type TokenConverter = (token: MomoaToken) => JSONToken | JSONToken[];

const TOKEN_CONVERTERS = new WeakMap<MomoaDocument, TokenConverter>();
/**
 * Get the token converter function for the given sourceCode.
 */
export function getTokenConverter(
  jsonSourceCode: JSONSourceCode,
): TokenConverter {
  const converter = TOKEN_CONVERTERS.get(jsonSourceCode.ast);
  if (converter) {
    return converter;
  }
  const convertedTokens = new Map<MomoaToken, JSONToken | JSONToken[]>();

  const tokenConverters: {
    [Node in MomoaToken["type"]]: (
      token: MomoaToken,
    ) => JSONToken | JSONToken[];
  } = {
    BlockComment(token) {
      return {
        type: "Block",
        get value() {
          return jsonSourceCode.text.slice(
            token.range![0] + 2,
            token.range![1] - 2,
          );
        },
        range: token.range,
        loc: convertSourceLocationFromJsonToJsonc(token.loc),
      };
    },
    LineComment(token) {
      return {
        type: "Line",
        get value() {
          return jsonSourceCode.text.slice(
            token.range![0] + 2,
            token.range![1],
          );
        },
        range: token.range,
        loc: convertSourceLocationFromJsonToJsonc(token.loc),
      };
    },
    Boolean(token) {
      return createStandardToken("Keyword", token);
    },
    Null(token) {
      return createStandardToken("Keyword", token);
    },
    Identifier(token) {
      return createStandardToken("Identifier", token);
    },
    Infinity(token) {
      const raw = jsonSourceCode.text.slice(...token.range!);
      if (raw.startsWith("-") || raw.startsWith("+")) {
        return [
          createPunctuator(raw[0], {
            range: [token.range![0], token.range![0] + 1],
            loc: {
              start: token.loc.start,
              end: {
                line: token.loc.start.line,
                column: token.loc.start.column + 1,
              },
            },
          }),
          createStandardToken("Identifier", {
            range: [token.range![0] + 1, token.range![1]],
            loc: {
              start: {
                line: token.loc.start.line,
                column: token.loc.start.column + 1,
              },
              end: token.loc.end,
            },
          }),
        ];
      }
      return createStandardToken("Identifier", token);
    },
    NaN(token) {
      const raw = jsonSourceCode.text.slice(...token.range!);
      if (raw.startsWith("-") || raw.startsWith("+")) {
        return [
          createPunctuator(raw[0], {
            range: [token.range![0], token.range![0] + 1],
            loc: {
              start: token.loc.start,
              end: {
                line: token.loc.start.line,
                column: token.loc.start.column + 1,
              },
            },
          }),
          createStandardToken("Identifier", {
            range: [token.range![0] + 1, token.range![1]],
            loc: {
              start: {
                line: token.loc.start.line,
                column: token.loc.start.column + 1,
              },
              end: token.loc.end,
            },
          }),
        ];
      }
      return createStandardToken("Identifier", token);
    },
    Number(token) {
      const raw = jsonSourceCode.text.slice(...token.range!);
      if (raw.startsWith("-") || raw.startsWith("+")) {
        return [
          createPunctuator(raw[0], {
            range: [token.range![0], token.range![0] + 1],
            loc: {
              start: token.loc.start,
              end: {
                line: token.loc.start.line,
                column: token.loc.start.column + 1,
              },
            },
          }),
          createStandardToken("Numeric", {
            range: [token.range![0] + 1, token.range![1]],
            loc: {
              start: {
                line: token.loc.start.line,
                column: token.loc.start.column + 1,
              },
              end: token.loc.end,
            },
          }),
        ];
      }
      return createStandardToken("Numeric", token);
    },
    String(token) {
      return createStandardToken("String", token);
    },
    Colon(token) {
      return createPunctuator(":", token);
    },
    Comma(token) {
      return createPunctuator(",", token);
    },
    LBracket(token) {
      return createPunctuator("[", token);
    },
    LBrace(token) {
      return createPunctuator("{", token);
    },
    RBracket(token) {
      return createPunctuator("]", token);
    },
    RBrace(token) {
      return createPunctuator("}", token);
    },
  };
  TOKEN_CONVERTERS.set(jsonSourceCode.ast, convertToken);
  return convertToken;

  /**
   * Create a token.
   */
  function createStandardToken(
    type: JSONToken["type"],
    token: { range?: [number, number]; loc: AST.SourceLocation },
  ): JSONToken {
    return {
      type,
      get value() {
        return jsonSourceCode.text.slice(...token.range!);
      },
      range: token.range!,
      loc: convertSourceLocationFromJsonToJsonc(token.loc),
    };
  }

  /**
   * Create a punctuator token.
   */
  function createPunctuator(
    value: string,
    token: { range?: [number, number]; loc: AST.SourceLocation },
  ): JSONToken {
    return {
      type: "Punctuator",
      value,
      range: token.range!,
      loc: convertSourceLocationFromJsonToJsonc(token.loc),
    };
  }

  /**
   * Convert the given momoa token to a JSONC token.
   */
  function convertToken(token: MomoaToken): JSONToken | JSONToken[] {
    if (convertedTokens.has(token)) {
      return convertedTokens.get(token)!;
    }

    const newToken = tokenConverters[token.type](token);
    convertedTokens.set(token, newToken);
    return newToken;
  }
}

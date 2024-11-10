import type { JSONSourceCode } from "@eslint/json";
import type { AST } from "jsonc-eslint-parser";
import type { MomoaDocument, MomoaNode } from "./momoa";
import { convertSourceLocationFromJsonToJsonc } from "./location-converter";
import { getTokenConverter } from "./token-converter";

type NodeConvertMap = {
  Array: AST.JSONArrayExpression;
  Boolean: AST.JSONKeywordLiteral;
  Null: AST.JSONKeywordLiteral;
  Number:
    | AST.JSONNumberLiteral
    | [AST.JSONUnaryExpression, AST.JSONNumberLiteral];
  String: AST.JSONStringLiteral;
  Document: [AST.JSONProgram, AST.JSONExpressionStatement];
  Object: AST.JSONObjectExpression;
  Member: AST.JSONProperty;
  Identifier: AST.JSONIdentifier;
  Infinity:
    | AST.JSONNumberIdentifier
    | [AST.JSONUnaryExpression, AST.JSONNumberIdentifier];
  NaN:
    | AST.JSONNumberIdentifier
    | [AST.JSONUnaryExpression, AST.JSONNumberIdentifier];
};

export type TargetMomoaNode = Extract<
  MomoaNode,
  { type: keyof NodeConvertMap }
>;
export type NodeConverter = <N extends TargetMomoaNode>(
  node: N,
) => NodeConvertMap[N["type"]];

const NODE_CONVERTERS = new WeakMap<MomoaDocument, NodeConverter>();
/**
 * Get the node converter function for the given sourceCode.
 */
export function getNodeConverter(
  jsonSourceCode: JSONSourceCode,
): NodeConverter {
  const converter = NODE_CONVERTERS.get(jsonSourceCode.ast);
  if (converter) {
    return converter;
  }
  const tokenConverter = getTokenConverter(jsonSourceCode);
  const convertedNodes = new Map<MomoaNode, AST.JSONNode | AST.JSONNode[]>();

  const nodeConverters: {
    [Node in TargetMomoaNode as Node["type"]]: (
      node: Node,
    ) => NodeConvertMap[Node["type"]];
  } = {
    Array(node) {
      let elements;
      return {
        get parent() {
          return getParent(node) as AST.JSONArrayExpression["parent"];
        },
        type: "JSONArrayExpression",
        get elements() {
          return (elements ??= node.elements.map((e) => convertNode(e.value)));
        },
        range: node.range!,
        loc: convertSourceLocationFromJsonToJsonc(node.loc),
      };
    },
    Boolean(node) {
      return {
        get parent() {
          return getParent(node) as AST.JSONLiteral["parent"];
        },
        type: "JSONLiteral",
        value: node.value,
        bigint: null,
        regex: null,
        get raw() {
          return jsonSourceCode.text.slice(...node.range!);
        },
        range: node.range!,
        loc: convertSourceLocationFromJsonToJsonc(node.loc),
      };
    },
    Null(node) {
      return {
        get parent() {
          return getParent(node) as AST.JSONLiteral["parent"];
        },
        type: "JSONLiteral",
        value: null,
        bigint: null,
        regex: null,
        get raw() {
          return jsonSourceCode.text.slice(...node.range!);
        },
        range: node.range!,
        loc: convertSourceLocationFromJsonToJsonc(node.loc),
      };
    },
    Number(node) {
      const raw = jsonSourceCode.text.slice(...node.range!);
      if (raw.startsWith("-") || raw.startsWith("+")) {
        const argumentRange = [node.range![0] + 1, node.range![1]] as [
          number,
          number,
        ];
        const rawArgument = jsonSourceCode.text.slice(...argumentRange);
        const literal: AST.JSONLiteral = {
          get parent() {
            // eslint-disable-next-line @typescript-eslint/no-use-before-define -- OK
            return unaryExpression;
          },
          type: "JSONLiteral",
          value: Math.abs(node.value),
          bigint: null,
          regex: null,
          raw: rawArgument,
          range: argumentRange,
          loc: convertSourceLocationFromJsonToJsonc({
            start: {
              line: node.loc.start.line,
              column: node.loc.start.column + 1,
            },
            end: node.loc.end,
          }),
        };
        const unaryExpression: AST.JSONUnaryExpression = {
          get parent() {
            return getParent(node) as AST.JSONUnaryExpression["parent"];
          },
          type: "JSONUnaryExpression",
          operator: raw[0] as "-" | "+",
          prefix: true,
          argument: literal,
          range: node.range!,
          loc: convertSourceLocationFromJsonToJsonc(node.loc),
        };
        return [unaryExpression, literal];
      }
      return {
        get parent() {
          return getParent(node) as AST.JSONLiteral["parent"];
        },
        type: "JSONLiteral",
        value: node.value,
        bigint: null,
        regex: null,
        get raw() {
          return jsonSourceCode.text.slice(...node.range!);
        },
        range: node.range!,
        loc: convertSourceLocationFromJsonToJsonc(node.loc),
      };
    },
    String(node) {
      return {
        get parent() {
          return getParent(node) as AST.JSONLiteral["parent"];
        },
        type: "JSONLiteral",
        value: node.value,
        bigint: null,
        regex: null,
        get raw() {
          return jsonSourceCode.text.slice(...node.range!);
        },
        range: node.range!,
        loc: convertSourceLocationFromJsonToJsonc(node.loc),
      };
    },
    Document(node): [AST.JSONProgram, AST.JSONExpressionStatement] {
      let expression, tokens, comments;
      const program: AST.JSONProgram = {
        get parent() {
          return getParent(node) as AST.JSONProgram["parent"];
        },
        type: "Program",
        get body() {
          // eslint-disable-next-line @typescript-eslint/no-use-before-define -- OK
          return body;
        },
        get comments() {
          return (comments ??= node
            .tokens!.filter(
              (token) =>
                token.type === "LineComment" || token.type === "BlockComment",
            )
            .flatMap(tokenConverter));
        },
        get tokens() {
          return (tokens ??= node
            .tokens!.filter(
              (token) =>
                token.type !== "LineComment" && token.type !== "BlockComment",
            )
            .flatMap(tokenConverter));
        },
        range: node.range!,
        loc: convertSourceLocationFromJsonToJsonc(node.loc),
      };
      const expr: AST.JSONExpressionStatement = {
        parent: program,
        type: "JSONExpressionStatement",
        get expression() {
          return (expression ??= convertNode(node.body));
        },
        range: node.body.range!,
        loc: convertSourceLocationFromJsonToJsonc(node.body.loc),
      };
      const body: AST.JSONProgram["body"] = [expr];

      return [program, expr];
    },
    Object(node) {
      let members;
      return {
        get parent() {
          return getParent(node) as AST.JSONObjectExpression["parent"];
        },
        type: "JSONObjectExpression",
        get properties() {
          return (members ??= node.members.map(convertNode));
        },
        range: node.range!,
        loc: convertSourceLocationFromJsonToJsonc(node.loc),
      };
    },
    Member(node) {
      let keyNode, value;
      return {
        get parent() {
          return getParent(node) as AST.JSONProperty["parent"];
        },
        type: "JSONProperty",
        get key() {
          return (keyNode ??= convertNode(node.name));
        },
        get value() {
          return (value ??= convertNode(node.value));
        },
        kind: "init",
        method: false,
        shorthand: false,
        computed: false,
        range: node.range!,
        loc: convertSourceLocationFromJsonToJsonc(node.loc),
      };
    },
    Identifier(node) {
      return {
        get parent() {
          return getParent(node) as AST.JSONIdentifier["parent"];
        },
        type: "JSONIdentifier",
        name: node.name,
        range: node.range!,
        loc: convertSourceLocationFromJsonToJsonc(node.loc),
      };
    },
    Infinity(node) {
      const raw = jsonSourceCode.text.slice(...node.range!);
      if (raw.startsWith("-") || raw.startsWith("+")) {
        const argumentRange = [node.range![0] + 1, node.range![1]] as [
          number,
          number,
        ];
        const identifier: AST.JSONNumberIdentifier = {
          get parent() {
            // eslint-disable-next-line @typescript-eslint/no-use-before-define -- OK
            return unaryExpression;
          },
          type: "JSONIdentifier",
          name: "Infinity",
          range: argumentRange,
          loc: convertSourceLocationFromJsonToJsonc({
            start: {
              line: node.loc.start.line,
              column: node.loc.start.column + 1,
            },
            end: node.loc.end,
          }),
        };
        const unaryExpression: AST.JSONUnaryExpression = {
          get parent() {
            return getParent(node) as AST.JSONUnaryExpression["parent"];
          },
          type: "JSONUnaryExpression",
          operator: raw[0] as "-" | "+",
          prefix: true,
          argument: identifier,
          range: node.range!,
          loc: convertSourceLocationFromJsonToJsonc(node.loc),
        };
        return [unaryExpression, identifier];
      }
      return {
        get parent() {
          return getParent(node) as AST.JSONIdentifier["parent"];
        },
        type: "JSONIdentifier",
        name: "Infinity",
        range: node.range!,
        loc: convertSourceLocationFromJsonToJsonc(node.loc),
      };
    },
    NaN(node) {
      const raw = jsonSourceCode.text.slice(...node.range!);
      if (raw.startsWith("-") || raw.startsWith("+")) {
        const argumentRange = [node.range![0] + 1, node.range![1]] as [
          number,
          number,
        ];
        const identifier: AST.JSONNumberIdentifier = {
          get parent() {
            // eslint-disable-next-line @typescript-eslint/no-use-before-define -- OK
            return unaryExpression;
          },
          type: "JSONIdentifier",
          name: "NaN",
          range: argumentRange,
          loc: convertSourceLocationFromJsonToJsonc({
            start: {
              line: node.loc.start.line,
              column: node.loc.start.column + 1,
            },
            end: node.loc.end,
          }),
        };
        const unaryExpression: AST.JSONUnaryExpression = {
          get parent() {
            return getParent(node) as AST.JSONUnaryExpression["parent"];
          },
          type: "JSONUnaryExpression",
          operator: raw[0] as "-" | "+",
          prefix: true,
          argument: identifier,
          range: node.range!,
          loc: convertSourceLocationFromJsonToJsonc(node.loc),
        };
        return [unaryExpression, identifier];
      }
      return {
        get parent() {
          return getParent(node) as AST.JSONIdentifier["parent"];
        },
        type: "JSONIdentifier",
        name: "NaN",
        range: node.range!,
        loc: convertSourceLocationFromJsonToJsonc(node.loc),
      };
    },
  };
  NODE_CONVERTERS.set(jsonSourceCode.ast, convertNode as NodeConverter);
  return convertNode as NodeConverter;

  /**
   * Get the parent node of the given node.
   */
  function getParent(node: MomoaNode): AST.JSONNode | null {
    const parent = jsonSourceCode.getParent(node);
    if (!parent) return null;
    const parentNode = parent as MomoaNode;
    if (parentNode.type === "Element") {
      // There is no jsonc-eslint-parser node that corresponds to the Element node.
      return getParent(parentNode);
    }
    const convertedParent = convertNode(parentNode);
    if (Array.isArray(convertedParent)) {
      return convertedParent[1];
    }
    return convertedParent;
  }

  /**
   * Convert the given momoa node to a JSONC node.
   */
  function convertNode<T extends AST.JSONNode>(node: TargetMomoaNode): T | T[] {
    if (convertedNodes.has(node)) {
      return convertedNodes.get(node)! as T | T[];
    }

    const newNode = nodeConverters[node.type](node as never);
    convertedNodes.set(node, newNode as never);
    return newNode as T | T[];
  }
}

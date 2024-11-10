import esquery from "esquery";
import type { AST } from "jsonc-eslint-parser";
import { VisitorKeys } from "jsonc-eslint-parser";

type QueryInfo = {
  query: string;
  match: (node: AST.JSONNode) => boolean;
};

const NODE_TYPE_MAP = new Map<string, string[]>([
  ["Program", ["Document"]],
  ["JSONExpressionStatement", ["Document"]],
  ["JSONLiteral", ["Boolean", "String", "Null", "Number"]],
  ["JSONArrayExpression", ["Array"]],
  ["JSONObjectExpression", ["Object"]],
  ["JSONProperty", ["Member"]],
  ["JSONIdentifier", ["Identifier", "Infinity", "NaN"]],
  ["JSONUnaryExpression", ["Number", "Infinity", "NaN"]],
]);

const reIsSimpleNodeQuery = /^[a-z]+$/iu;

/**
 * This is a helper function that converts the given node query to a node query that `@eslint/json` nodes.
 */
export function convertQuery(eslintQuery: string): QueryInfo {
  const exit = eslintQuery.endsWith(":exit");
  const query = exit ? eslintQuery.slice(0, -5) : eslintQuery;
  const converted = convertRawQuery(query);
  return exit
    ? {
        query: `${converted.query}:exit`,
        match: converted.match,
      }
    : converted;
}

/**
 * Converts the given query to a query that `@eslint/json` nodes.
 */
function convertRawQuery(query: string): QueryInfo {
  const queries = query.split(",").map((q) => q.trim());
  if (queries.every((q) => reIsSimpleNodeQuery.test(q))) {
    const nodes = new Set(queries);
    const convertedQueries: string[] = [];
    for (const node of nodes) {
      const converted = NODE_TYPE_MAP.get(node) || "";
      if (converted) {
        convertedQueries.push(...converted);
      }
    }
    return {
      query: convertedQueries.join(","),
      match: (node) => nodes.has(node.type),
    };
  }
  if (query === "*") {
    return {
      query: "*",
      match: () => true,
    };
  }

  const selector = esquery.parse(query);
  const match = (node: AST.JSONNode) => {
    let target = node;
    const ancestors = [];
    while (target.parent) {
      ancestors.push(target.parent);
      target = target.parent;
    }

    return esquery.matches(node as never, selector, ancestors as never, {
      visitorKeys: VisitorKeys,
    });
  };
  return { query: "*", match };
}

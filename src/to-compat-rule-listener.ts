import type { JSONSourceCode } from "@eslint/json";
import type { AST, RuleFunction, RuleListener } from "jsonc-eslint-parser";
import type { TargetMomoaNode } from "./lib/node-converter";
import { getNodeConverter } from "./lib/node-converter";
import type { MomoaNode } from "./lib/momoa";
import { isMomoaNode } from "./lib/checker";
import { convertQuery } from "./lib/query-converter";

/**
 * This is a helper function that converts the given listener into a listener that can also listen to `@eslint/json` nodes.
 */
export function toCompatRuleListener(
  ruleListener: RuleListener,
  jsonSourceCode: JSONSourceCode,
): RuleListener {
  const convert = getNodeConverter(jsonSourceCode);

  const jsoncNodeVisitors = new Map<string, RuleFunction[]>();
  const queries = new Set<string>();

  for (const [key, fn] of Object.entries(ruleListener)) {
    if (!fn) continue;
    queries.add(key);
    const convertedQuery = convertQuery(key);
    if (!convertedQuery) continue;
    const { query, match } = convertedQuery;
    queries.add(query);
    let jsoncNodeVisitorList = jsoncNodeVisitors.get(query);
    if (!jsoncNodeVisitorList) {
      jsoncNodeVisitorList = [];
      jsoncNodeVisitors.set(query, jsoncNodeVisitorList);
    }
    jsoncNodeVisitorList.push((node) => {
      if (match(node)) {
        fn(node);
      }
    });
  }

  const result: RuleListener = {};

  for (const query of queries) {
    result[query] = (node: AST.JSONNode | MomoaNode) => {
      if (isMomoaNode(node)) {
        if (node.type !== "Element") {
          const jsoncNodeVisitorList = jsoncNodeVisitors.get(query);
          if (!jsoncNodeVisitorList) return;
          const invoke = query.endsWith(":exit")
            ? invokeWithReverseConvertedNode
            : invokeWithConvertedNode;
          invoke(node, (n) => {
            jsoncNodeVisitorList.forEach((cb) => cb(n as never));
          });
        }
      } else {
        ruleListener[query]?.(node as never);
      }
    };
  }

  return result;

  /**
   * Invoke the given callback with the converted node.
   */
  function invokeWithConvertedNode(
    node: TargetMomoaNode,
    cb: (node: AST.JSONNode) => void,
  ) {
    const jsonNodeData = convert(node);
    if (jsonNodeData.nodes) {
      for (const n of jsonNodeData.nodes) {
        cb(n);
      }
    } else {
      cb(jsonNodeData.node);
    }
  }

  /**
   * Invoke the given callback with the converted node in reverse order.
   */
  function invokeWithReverseConvertedNode(
    node: TargetMomoaNode,
    cb: (node: AST.JSONNode) => void,
  ) {
    const jsonNodeData = convert(node);
    if (jsonNodeData.nodes) {
      for (let index = jsonNodeData.nodes.length - 1; index >= 0; index--) {
        const n = jsonNodeData.nodes[index];
        cb(n);
      }
    } else {
      cb(jsonNodeData.node);
    }
  }
}

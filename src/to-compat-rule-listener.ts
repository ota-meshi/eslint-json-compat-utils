import type { JSONSourceCode } from "@eslint/json";
import type { AST, RuleListener } from "jsonc-eslint-parser";
import type { TargetMomoaNode } from "./lib/node-converter";
import { getNodeConverter } from "./lib/node-converter";
import type { MomoaNode, MomoaRuleListener } from "./lib/momoa";
import { isMomoaNode } from "./lib/checker";

/**
 * This is a helper function that converts the given listener into a listener that can also listen to `@eslint/json` nodes.
 */
export function toCompatRuleListener(
  listener: RuleListener,
  jsonSourceCode: JSONSourceCode,
): RuleListener {
  const convert = getNodeConverter(jsonSourceCode);
  const listenerKeysSet = new Set<keyof MomoaRuleListener>();
  for (const [jsonKey, momoaKeys] of [
    ["Program", ["Document"]],
    ["JSONExpressionStatement", ["Document"]],
    ["JSONLiteral", ["Boolean", "String", "Null", "Number"]],
    ["JSONArrayExpression", ["Array"]],
    ["JSONObjectExpression", ["Object"]],
    ["JSONProperty", ["Member"]],
    ["JSONIdentifier", ["Identifier", "Infinity", "NaN"]],
    ["JSONUnaryExpression", ["Number", "Infinity", "NaN"]],
  ] as const) {
    if (listener[jsonKey]) {
      for (const momoaKey of momoaKeys) {
        listenerKeysSet.add(momoaKey);
      }
    }
    if (listener[`${jsonKey}:exit`]) {
      for (const momoaKey of momoaKeys) {
        listenerKeysSet.add(`${momoaKey}:exit`);
      }
    }
  }

  const result: RuleListener = Object.fromEntries(
    [...listenerKeysSet].map((key) => {
      const dispatchListener = key.endsWith(":exit") ? dispatchExit : dispatch;
      return [key, dispatchListener];
    }),
  );

  for (const [key, fn] of Object.entries(listener)) {
    if (!fn) continue;

    const newFn = (node: AST.JSONNode | MomoaNode, ...args: []) => {
      if (isMomoaNode(node)) {
        if (node.type !== "Element") {
          const invoke = key.endsWith(":exit")
            ? invokeWithReverseConvertedNode
            : invokeWithConvertedNode;
          invoke(node, (n) => fn(n as never, ...args));
        }
      } else {
        fn(node as never, ...args);
      }
    };

    const momoaFn = result[key];
    if (momoaFn) {
      result[key] = (...args) => {
        momoaFn(...args);
        newFn(...args);
      };
    } else {
      result[key] = newFn;
    }
  }
  return result;

  /**
   * Dispatch the given node to the listener.
   */
  function dispatch(node: TargetMomoaNode) {
    invokeWithConvertedNode(node, (n) => listener[n.type]?.(n as never));
  }

  /**
   * Dispatch the given node to the exit listener.
   */
  function dispatchExit(node: TargetMomoaNode) {
    invokeWithReverseConvertedNode(node, (n) =>
      listener[`${n.type}:exit`]?.(n as never),
    );
  }

  /**
   * Invoke the given callback with the converted node.
   */
  function invokeWithConvertedNode(
    node: TargetMomoaNode,
    cb: (node: AST.JSONNode) => void,
  ) {
    const jsonNode = convert(node);
    if (Array.isArray(jsonNode)) {
      for (const n of jsonNode) {
        cb(n);
      }
    } else {
      cb(jsonNode);
    }
  }

  /**
   * Invoke the given callback with the converted node in reverse order.
   */
  function invokeWithReverseConvertedNode(
    node: TargetMomoaNode,
    cb: (node: AST.JSONNode) => void,
  ) {
    const jsonNode = convert(node);
    if (Array.isArray(jsonNode)) {
      for (let index = jsonNode.length - 1; index >= 0; index--) {
        const n = jsonNode[index];
        cb(n);
      }
    } else {
      cb(jsonNode);
    }
  }
}

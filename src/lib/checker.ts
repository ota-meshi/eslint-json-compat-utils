import type { JSONSourceCode } from "@eslint/json";
import type { SourceCode } from "eslint";
import type { AST } from "jsonc-eslint-parser";
import type { MomoaNode } from "./momoa";

const MOMOA_NODES = new Set<MomoaNode["type"]>([
  "Array",
  "Boolean",
  "Document",
  "Element",
  "Identifier",
  "Infinity",
  "Member",
  "NaN",
  "Null",
  "Number",
  "Object",
  "String",
]);

/**
 * Check whether the given sourceCode is a JSONSourceCode or not.
 */
export function isJSONSourceCode(
  sourceCode: SourceCode | JSONSourceCode,
): sourceCode is JSONSourceCode {
  return (
    sourceCode.ast?.type === "Document" &&
    sourceCode.ast.loc?.start?.column === 1 &&
    sourceCode.ast.body &&
    isMomoaNode(sourceCode.ast.body) &&
    typeof (sourceCode as JSONSourceCode).getParent === "function"
  );
}

/**
 * Check whether the given node is a Momoa node or not.
 */
export function isMomoaNode(node: AST.JSONNode | MomoaNode): node is MomoaNode {
  return MOMOA_NODES.has((node as MomoaNode).type);
}

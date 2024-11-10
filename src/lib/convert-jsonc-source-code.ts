import type { JSONSourceCode } from "@eslint/json";
import { SourceCode } from "eslint";
import { VisitorKeys } from "jsonc-eslint-parser";
import { getNodeConverter } from "./node-converter";
import { newProxyWithGet, proxyReflectValue } from "./new-proxy";

/**
 * This is a helper function that converts the JSONSourceCode to a sourceCode for JSONC.
 */
export function convertJsoncSourceCode(
  jsonSourceCode: JSONSourceCode,
): SourceCode {
  const convert = getNodeConverter(jsonSourceCode);
  const jsSourceCode = new SourceCode({
    text: jsonSourceCode.text,
    ast: convert(jsonSourceCode.ast)[0] as any,
    parserServices: { isJSON: true },
    visitorKeys: VisitorKeys,
  });

  const compatSourceCode: SourceCode | JSONSourceCode = newProxyWithGet(
    jsonSourceCode,
    (target, prop, receiver) => {
      const value = proxyReflectValue(
        Reflect.get(jsSourceCode, prop),
        jsSourceCode,
        target,
      );
      if (value !== undefined) return value;
      return Reflect.get(jsonSourceCode, prop, receiver);
    },
  );

  return compatSourceCode as unknown as SourceCode;
}

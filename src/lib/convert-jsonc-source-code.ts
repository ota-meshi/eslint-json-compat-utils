import type { JSONSourceCode } from "@eslint/json";
import { SourceCode } from "eslint";
import { VisitorKeys } from "jsonc-eslint-parser";
import { getNodeConverter } from "./node-converter";

/**
 * This is a helper function that converts the JSONSourceCode to a sourceCode for JSONC.
 */
export function convertJsoncSourceCode(
  jsonSourceCode: JSONSourceCode,
): SourceCode {
  const convert = getNodeConverter(jsonSourceCode);
  const jsSourceCode = new SourceCode({
    text: jsonSourceCode.text,
    ast: convert(jsonSourceCode.ast) as any,
    parserServices: { isJSON: true },
    visitorKeys: VisitorKeys,
  });

  const compatSourceCode: SourceCode | JSONSourceCode = new Proxy(
    jsonSourceCode,
    {
      get(_target, prop) {
        const value = Reflect.get(jsSourceCode, prop);
        if (value !== undefined)
          return typeof value === "function" ? value.bind(jsSourceCode) : value;
        const momoaValue = Reflect.get(jsonSourceCode, prop);
        return typeof momoaValue === "function"
          ? momoaValue.bind(jsonSourceCode)
          : momoaValue;
      },
    },
  );

  return compatSourceCode as unknown as SourceCode;
}

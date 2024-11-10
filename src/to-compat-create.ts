import type { Rule } from "eslint";
import { isJSONSourceCode } from "./lib/checker";
import { convertJsoncSourceCode } from "./lib/convert-jsonc-source-code";
import {
  convertPositionFromJsoncToJson,
  convertSourceLocationFromJsoncToJson,
} from "./lib/location-converter";
import { toCompatRuleListener } from "./to-compat-rule-listener";
import type { RuleListener } from "jsonc-eslint-parser";
import { newProxyWithProperties } from "./lib/new-proxy";

export type LazyRuleContext = {
  report(descriptor: any): void;
};
export type LazyCreate<C extends LazyRuleContext> = (
  context: C,
  ...args: any[]
) => any;

const CONVERTED = new WeakMap<LazyCreate<any>, LazyCreate<any>>();

/**
 * This is a helper function that converts the given create function into `@eslint/json` compatible create function.
 */
export function toCompatCreate<
  C extends LazyRuleContext,
  F extends LazyCreate<C>,
>(create: F): F {
  if (CONVERTED.has(create)) {
    return CONVERTED.get(create) as F;
  }
  const result = (context: Rule.RuleContext, ...args: []) => {
    const originalSourceCode = context.sourceCode;
    if (!originalSourceCode || !isJSONSourceCode(originalSourceCode)) {
      return create(context as never, ...args);
    }

    let sourceCode;
    const compatContext: Rule.RuleContext = newProxyWithProperties(context, {
      get sourceCode() {
        return (sourceCode ??= convertJsoncSourceCode(originalSourceCode));
      },
      report(descriptor: Rule.ReportDescriptor): void {
        // Revert to `@eslint/json` report position (1-based column).
        const momoaDescriptor = {
          ...descriptor,
        };
        if ("loc" in momoaDescriptor && momoaDescriptor.loc) {
          if ("line" in momoaDescriptor.loc) {
            momoaDescriptor.loc = convertPositionFromJsoncToJson(
              momoaDescriptor.loc,
            );
          } else {
            momoaDescriptor.loc = convertSourceLocationFromJsoncToJson(
              momoaDescriptor.loc,
            );
          }
        }
        if ("node" in momoaDescriptor && momoaDescriptor.node) {
          momoaDescriptor.node = {
            ...momoaDescriptor.node,
            loc: convertSourceLocationFromJsoncToJson(
              momoaDescriptor.node.loc!,
            ),
          };
        }
        context.report(momoaDescriptor);
      },
    });

    return toCompatRuleListener(
      create(compatContext as never, ...args) as RuleListener,
      originalSourceCode,
    );
  };
  CONVERTED.set(create, result);
  return result as never as F;
}

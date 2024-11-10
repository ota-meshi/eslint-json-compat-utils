import type { Rule } from "eslint";
import type { LazyCreate } from "./to-compat-create";
import { toCompatCreate } from "./to-compat-create";

export type LazyRuleModule = {
  create: LazyCreate;
  meta?: Rule.RuleMetaData;
};

const CONVERTED = new WeakMap<LazyRuleModule, LazyRuleModule>();

/**
 * This is a helper function that converts the given rule object into `@eslint/json` compatible rule.
 */
export function toCompatRule<R extends LazyRuleModule>(rule: R): R {
  if (CONVERTED.has(rule)) {
    return CONVERTED.get(rule) as R;
  }
  const result: R = {
    ...rule,
    create: toCompatCreate(rule.create),
  };
  CONVERTED.set(rule, result);
  return result;
}

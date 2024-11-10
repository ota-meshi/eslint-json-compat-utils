import type { LazyRuleModule } from "./to-compat-rule";
import { toCompatRule } from "./to-compat-rule";

export type LazyPlugin = {
  rules?: Record<string, LazyRuleModule> | undefined;
};

const CONVERTED = new WeakMap<LazyPlugin, LazyPlugin>();

/**
 * This is a helper function that converts the given rule object into `@eslint/json` compatible rule.
 */
export function toCompatPlugin<P extends LazyPlugin>(plugin: P): P {
  if (!plugin.rules) {
    return plugin;
  }
  if (CONVERTED.has(plugin)) {
    return CONVERTED.get(plugin) as P;
  }
  const rules = new Proxy(plugin.rules, {
    get(target, prop) {
      const rule = Reflect.get(target, prop);
      return rule && toCompatRule(rule);
    },
  });
  const result: P = new Proxy(plugin, {
    get(target, prop) {
      if (prop === "rules") {
        return rules;
      }
      return Reflect.get(target, prop);
    },
  });
  CONVERTED.set(plugin, result);
  return result;
}

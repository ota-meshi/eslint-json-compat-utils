import type { AnyNode } from "@humanwhocodes/momoa";
export type {
  Token as MomoaToken,
  DocumentNode as MomoaDocument,
} from "@humanwhocodes/momoa";
export type MomoaNode = AnyNode;
type MomoaRuleFunction<Node extends MomoaNode = never> = (node: Node) => void;
type MomoaBuiltInRuleListeners = {
  [Node in MomoaNode as Node["type"]]?: MomoaRuleFunction<Node>;
};
type MomoaBuiltInRuleListenerExits = {
  [Node in MomoaNode as `${Node["type"]}:exit`]?: MomoaRuleFunction<Node>;
};
export type MomoaRuleListener = MomoaBuiltInRuleListeners &
  MomoaBuiltInRuleListenerExits;

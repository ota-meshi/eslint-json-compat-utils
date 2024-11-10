import type { AST } from "jsonc-eslint-parser";

/**
 * Convert the source location from `@eslint/json` to JSONC.
 */
export function convertSourceLocationFromJsonToJsonc(
  loc: AST.SourceLocation,
): AST.SourceLocation {
  return {
    start: convertPositionFromJsonToJsonc(loc.start),
    end: convertPositionFromJsonToJsonc(loc.end),
  };
}

/**
 * Convert the position from `@eslint/json` to JSONC.
 */
export function convertPositionFromJsonToJsonc(
  position: AST.Position,
): AST.Position {
  return {
    line: position.line,
    column: position.column - 1,
  };
}

/**
 * Convert the source location from JSONC to `@eslint/json`.
 */
export function convertSourceLocationFromJsoncToJson(
  loc: AST.SourceLocation,
): AST.SourceLocation {
  return {
    start: convertPositionFromJsoncToJson(loc.start),
    end: convertPositionFromJsoncToJson(loc.end),
  };
}

/**
 * Convert the position from JSONC to `@eslint/json`.
 */
export function convertPositionFromJsoncToJson(
  position: AST.Position,
): AST.Position {
  return {
    line: position.line,
    column: position.column + 1,
  };
}

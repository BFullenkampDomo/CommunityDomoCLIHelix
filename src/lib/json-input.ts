import { readFileSync } from "node:fs";

/**
 * Resolve a JSON input from either an inline string or a file path.
 *
 * - If `inline` is provided and equals "-", reads from stdin (not implemented yet — use file).
 * - If `inline` is provided, parses it as JSON directly.
 * - If `filePath` is provided, reads the file and parses as JSON.
 * - Throws a clear error if neither is provided when required.
 */
export function resolveJsonInput(
  inline?: string,
  filePath?: string
): unknown {
  if (inline) {
    try {
      return JSON.parse(inline);
    } catch (e) {
      throw new Error(`Invalid JSON in inline argument: ${(e as Error).message}`);
    }
  }

  if (filePath) {
    try {
      const content = readFileSync(filePath, "utf-8");
      return JSON.parse(content);
    } catch (e) {
      throw new Error(`Failed to read/parse JSON file '${filePath}': ${(e as Error).message}`);
    }
  }

  throw new Error("Either inline JSON or a file path must be provided.");
}

/**
 * Resolve a text input (like CSV) from either an inline string or a file path.
 */
export function resolveTextInput(
  inline?: string,
  filePath?: string
): string {
  if (inline) return inline;

  if (filePath) {
    try {
      return readFileSync(filePath, "utf-8");
    } catch (e) {
      throw new Error(`Failed to read file '${filePath}': ${(e as Error).message}`);
    }
  }

  throw new Error("Either inline text or a file path must be provided.");
}

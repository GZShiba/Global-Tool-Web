import type { Tool } from '../types';
import { hasRegisteredImplementation } from '../tools/registry';

/**
 * Authoritative "Open Tool" routing decision, used by every public entry
 * point (cards, detail page, search, featured, related, list rows).
 *
 * Priority:
 *  1. External redirect enabled → use the validated external URL (applying
 *     the configured delay when one is set). Never fall back to an internal
 *     route when the external configuration is invalid.
 *  2. Otherwise → if a registered working implementation exists, open its
 *     real internal tool page (/tools/<slug>/run).
 *  3. Otherwise → unavailable/draft state. Never open a fake page.
 */
export type ToolAction =
  | { kind: 'external'; url: string; delaySeconds: number }
  | { kind: 'internal' }
  | { kind: 'unavailable'; reason: 'no-implementation' | 'invalid-external-url' };

/** Validate an external URL strictly (http/https, parses, no whitespace). */
export function isValidExternalUrl(url: string | undefined): url is string {
  if (!url || typeof url !== 'string') return false;
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/** Configured redirect delay in whole seconds (0 = immediately). */
export function getRedirectDelaySeconds(tool: Tool): number {
  const d = tool.redirectDelaySeconds;
  return typeof d === 'number' && Number.isFinite(d) && d > 0 ? Math.floor(d) : 0;
}

/** Sole decision helper — all Open Tool surfaces call this. */
export function resolveToolAction(tool: Tool): ToolAction {
  if (tool.redirectEnabled) {
    if (!isValidExternalUrl(tool.externalUrl)) {
      return { kind: 'unavailable', reason: 'invalid-external-url' };
    }
    return {
      kind: 'external',
      url: tool.externalUrl,
      delaySeconds: getRedirectDelaySeconds(tool),
    };
  }

  if (hasRegisteredImplementation(tool.implementationId) || hasRegisteredImplementation(tool.slug)) {
    return { kind: 'internal' };
  }

  return { kind: 'unavailable', reason: 'no-implementation' };
}

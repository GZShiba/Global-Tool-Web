import type { ComponentType } from 'react';

/**
 * Registered working-implementation registry.
 *
 * A CMS tool record and a working implementation are two different things.
 * This map is the ONLY source of truth for which internal tool interfaces
 * genuinely exist and can be opened.
 *
 * All demo/sample implementations were removed (Word Counter, Case Converter,
 * Lorem Ipsum, Slug Generator, JSON Formatter, CSV⇄JSON, Base64, URL
 * Encoder, Number Base, Timestamp, UUID, Password, Hash, Regex Tester,
 * Color Converter, HTML Entities, Percentage, Unit, BMI, Image Resizer,
 * Image→Base64). They came from the legacy sample catalogue and were never
 * intended to be real products; no CMS records depend on them.
 *
 * The registry intentionally stays empty while keeping its shape, so genuine
 * implementations can be registered later without changing the architecture.
 */
export const toolRegistry: Record<string, ComponentType> = {};

/** True when an internal working interface exists for the given key. */
export function hasRegisteredImplementation(key?: string): boolean {
  return !!(key && toolRegistry[key]);
}

/**
 * Deterministic related-tool recommendations for the admin CMS.
 * Rules (explainable, no randomness):
 *  1. Only published tools are candidates (drafts/archived excluded).
 *  2. The current tool is never suggested.
 *  3. Preferred categories (if selected) are weighted highest.
 *  4. Otherwise the current tool's category is weighted highest.
 *  5. Shared tags add weight; shared descriptive words add small weight.
 *  6. Results are ranked by score, then stable order; capped at `max`.
 */

export interface RecommendableTool {
  id: string;
  slug: string;
  category: string;
  tags: string[];
  description: string;
  status?: string;
}

export interface RecommendOptions {
  toolId: string;
  toolCategory: string;
  toolTags: string[];
  toolDescription: string;
  candidates: RecommendableTool[];
  preferredCategories?: string[];
  max?: number;
}

export function recommendRelated(opts: RecommendOptions): RecommendableTool[] {
  const max = Math.max(0, opts.max ?? 4);
  const exclude = new Set<string>([opts.toolId]);
  const preferred = new Set<string>((opts.preferredCategories || []).filter(Boolean));
  const toolTagSet = new Set<string>((opts.toolTags || []).map(t => t.toLowerCase()));
  const descWords = new Set<string>(
    (opts.toolDescription || '')
      .toLowerCase()
      .split(/\W+/)
      .filter(w => w.length > 3),
  );

  const scored: { tool: RecommendableTool; score: number }[] = [];

  for (const cand of opts.candidates) {
    if (!cand || exclude.has(cand.id)) continue;
    if (cand.status === 'draft' || cand.status === 'archived') continue;

    let score = 0;
    if (preferred.size) {
      if (preferred.has(cand.category)) score += 10;
    } else if (cand.category === opts.toolCategory) {
      score += 8;
    }
    score += ((cand.tags || []).filter(t => toolTagSet.has(t.toLowerCase())).length) * 3;

    const candWords = (cand.description || '').toLowerCase().split(/\W+/);
    let sharedWords = 0;
    for (const w of candWords) {
      if (w.length > 3 && descWords.has(w)) sharedWords += 1;
    }
    score += Math.min(sharedWords, 4);

    if (score > 0) scored.push({ tool: cand, score });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, max).map(x => x.tool);
}

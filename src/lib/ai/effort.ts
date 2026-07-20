/**
 * Effort router: decide per message whether the chatbot should answer fast
 * (no thinking, ~2s) or spend real reasoning (dynamic thinking, ~7s).
 *
 * The classifier is a free, instant heuristic — using an LLM call to route
 * would defeat the purpose. "Deep" fires on planning/optimization intent or
 * long, detailed asks; everything else stays on the fast path.
 */

export type Effort = 'quick' | 'deep';

const DEEP_INTENT =
  /\b(re-?)?(plan|planning|reshuffle|rework|reorgani[sz]e|rearrange|redesign|overhaul)\b|\boptimi[sz]e\b|\bcompare\b|\btrade-?offs?\b|\bprioriti[sz]e\b|\bstrateg/i;

const DEEP_PHRASES =
  /\b(figure out|think (it |this )?through|really think|walk me through|best (way|order|route|plan|option)|what should we (cut|drop|skip|prioriti[sz]e)|whole (day|trip|itinerary)|the entire|from scratch|weigh the)\b/i;

export function classifyEffort(message: string): Effort {
  const m = message.trim();
  if (DEEP_INTENT.test(m) || DEEP_PHRASES.test(m)) return 'deep';
  // Long, detailed asks tend to be multi-constraint planning.
  if (m.length > 240) return 'deep';
  return 'quick';
}

/** Gemini generationConfig for each effort level. */
export function effortConfig(effort: Effort) {
  return {
    thinkingConfig: { thinkingBudget: effort === 'deep' ? -1 : 0 },
  };
}

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
  /\b(re-?)?(plan|planning|reshuffle|rework|reorgani[sz]e|rearrange|reorder|redesign|overhaul)\b|\boptimi[sz]e\b|\bcompare\b|\btrade-?offs?\b|\bprioriti[sz]e\b|\bstrateg|\brecommend|\bsuggest|\badvi[cs]e\b|\bshould (we|i|it)\b|\bis it (worth|better|a good idea)\b|\bwhat if\b|\bhelp (me|us)\b|\bidea|\bflag\b/i;

const DEEP_PHRASES =
  /\b(figure out|think (it |this )?through|really think|walk me through|take a look|look at (our|the|my|this)|best (way|order|route|plan|option|time)|what should we (cut|drop|skip|prioriti[sz]e|do)|anything (you|we|i)('?d| would| should| could)|whole (day|trip|itinerary)|the entire|from scratch|weigh the|worried about|concerned|running (behind|late)|too much|what do you think|make (it|this) (better|work))\b/i;

// Short, obvious fact lookups stay on the fast path; everything substantive
// (advice, planning, reasoning, open-ended) gets the smarter model.
const QUICK_LOOKUP =
  /^(what('?s| is| time)|when('?s| is)|where('?s| is)|how much|who('?s| is))\b.{0,60}$/i;

export function classifyEffort(message: string): Effort {
  const m = message.trim();
  if (DEEP_INTENT.test(m) || DEEP_PHRASES.test(m)) return 'deep';
  if (m.length <= 90 && QUICK_LOOKUP.test(m)) return 'quick';
  // Bias toward the smarter model — the companion should reason, not just fetch.
  if (m.length > 120) return 'deep';
  return 'quick';
}

/** The Gemini model for each effort level. Flash for fast lookups/chat (already
 *  far smarter than flash-lite), Pro for real planning + reasoning. */
export function modelFor(effort: Effort): string {
  return effort === 'deep' ? 'gemini-pro-latest' : 'gemini-flash-latest';
}

/** Gemini generationConfig for each effort level. */
export function effortConfig(effort: Effort) {
  return {
    thinkingConfig: { thinkingBudget: effort === 'deep' ? -1 : 0 },
  };
}

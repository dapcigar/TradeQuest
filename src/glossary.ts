export type GlossaryCategory = 'Foundations' | 'Chart skills' | 'Risk management' | 'Practice evidence';

export type GlossaryEntry = {
  id: string;
  term: string;
  category: GlossaryCategory;
  definition: string;
  example: string;
  caution?: string;
};

export const glossaryEntries: GlossaryEntry[] = [
  { id: 'base-currency', term: 'Base currency', category: 'Foundations', definition: 'The first currency in a currency pair. In EUR/USD, EUR is the base currency.', example: 'A EUR/USD quote of 1.0800 means one euro is quoted at 1.08 US dollars.', caution: 'A quoted price describes a relationship between two currencies, not a guaranteed future direction.' },
  { id: 'quote-currency', term: 'Quote currency', category: 'Foundations', definition: 'The second currency in a currency pair; it expresses the price of one unit of the base currency.', example: 'In GBP/USD, USD is the quote currency.' },
  { id: 'bid-ask', term: 'Bid and ask', category: 'Foundations', definition: 'The bid is the price a buyer offers; the ask is the price a seller asks. Which side applies depends on the transaction.', example: 'A hypothetical quote might show a bid of 1.2500 and an ask of 1.2502.', caution: 'Real quotes change, and the spread can widen. TradeQuest examples are not live prices.' },
  { id: 'spread', term: 'Spread', category: 'Foundations', definition: 'The difference between the ask and bid prices. It is one of the costs that can affect a trade.', example: 'If the ask is 1.2502 and the bid is 1.2500, the spread is 0.0002 in quoted-price units.', caution: 'Spread alone does not represent every trading cost.' },
  { id: 'candlestick', term: 'Candlestick', category: 'Chart skills', definition: 'A chart symbol that summarises open, high, low, and close prices for a chosen interval.', example: 'A one-hour candle summarises those four values over one hour.', caution: 'A candle does not reveal every price movement that happened inside the interval.' },
  { id: 'ohlc', term: 'OHLC', category: 'Chart skills', definition: 'Open, high, low, and close: the four standard values represented by a candlestick.', example: 'The high is the highest observed price in that interval; the low is the lowest.', caution: 'When only candle data is available, the exact order of intraperiod events may be unknown.' },
  { id: 'invalidation', term: 'Invalidation', category: 'Chart skills', definition: 'A condition that would undermine the reasoning behind a hypothetical market idea.', example: 'Before considering a scenario, state what evidence would show that its thesis no longer holds.', caution: 'An invalidation level is part of a plan, not a guarantee that an exit will fill there.' },
  { id: 'risk-budget', term: 'Risk budget', category: 'Risk management', definition: 'The maximum planned loss allocated to a hypothetical decision, based on explicit assumptions.', example: 'A 1% budget on a fictional £2,000 account is £20 before costs and execution uncertainty.', caution: 'Actual losses can exceed a planned budget because of gaps, slippage, leverage, and costs.' },
  { id: 'position-size', term: 'Position size', category: 'Risk management', definition: 'The quantity in a hypothetical position. It should be calculated from the risk budget, stop distance, and instrument-specific value assumptions.', example: 'A wider stop generally requires a smaller position to keep the same planned risk, all else equal.', caution: 'Contract sizes and tick or pip values differ by instrument; simplified calculator outputs may not fit every market.' },
  { id: 'stop-loss', term: 'Stop loss', category: 'Risk management', definition: 'An instruction or plan intended to close a position if a specified condition or price is reached.', example: 'A risk plan identifies the level that would invalidate the idea before entry.', caution: 'A stop does not guarantee the exact exit price, especially during gaps or fast markets.' },
  { id: 'slippage', term: 'Slippage', category: 'Risk management', definition: 'The difference between an expected transaction price and the price actually obtained.', example: 'A fast move may mean an order is filled at a less favourable price than expected.', caution: 'TradeQuest does not model real execution or broker fills.' },
  { id: 'gap', term: 'Price gap', category: 'Risk management', definition: 'A discontinuity between consecutive quoted prices, with no recorded prices in between.', example: 'A market may reopen at a different level after a closed session or major event.', caution: 'A stop may execute beyond its intended level if the market gaps.' },
  { id: 'synthetic-data', term: 'Synthetic data', category: 'Practice evidence', definition: 'Fictional values created for teaching rather than recorded observations from a live or historical market.', example: 'TradeQuest Chart Dojo uses clearly labelled synthetic teaching scenarios.', caution: 'Synthetic scenarios are not evidence of how a strategy would perform in real markets.' },
  { id: 'recall', term: 'Recall practice', category: 'Practice evidence', definition: 'Practising with a scenario or concept you have encountered before.', example: 'Revisiting a familiar spread question can help reinforce the definition.', caution: 'Repeating one question does not prove you can apply the idea in a new situation.' },
  { id: 'transfer', term: 'Transfer', category: 'Practice evidence', definition: 'Applying a learned principle to a meaningfully different, previously unseen scenario.', example: 'Using the same risk-budget rule in a new fictional setup tests application beyond memorising an answer.', caution: 'A few successful exercises are only a small learning signal, not proof of trading skill.' },
];

export function filterGlossary(entries: GlossaryEntry[], query: string, category: string): GlossaryEntry[] {
  const needle = query.trim().toLocaleLowerCase();
  return entries.filter(entry => {
    const categoryMatches = category === 'All concepts' || entry.category === category;
    const textMatches = !needle || [entry.term, entry.definition, entry.example, entry.caution ?? '', entry.category]
      .some(value => value.toLocaleLowerCase().includes(needle));
    return categoryMatches && textMatches;
  });
}

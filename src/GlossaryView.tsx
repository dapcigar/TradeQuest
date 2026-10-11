import { useMemo, useState } from 'react';
import { BookOpen, Search, ShieldCheck } from 'lucide-react';
import { filterGlossary, glossaryEntries, type GlossaryCategory } from './glossary';

const categories = ['All concepts', 'Foundations', 'Chart skills', 'Risk management', 'Practice evidence'] as const;

export default function GlossaryView() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<(typeof categories)[number]>('All concepts');
  const entries = useMemo(() => filterGlossary(glossaryEntries, query, category), [query, category]);
  return <div className="glossary-page">
    <div className="page-intro"><div className="eyebrow"><span className="eyebrow-line" /> YOUR FIELD GUIDE</div><h1>Understand the <span>language.</span></h1><p>A plain-English reference for market mechanics, chart reading, risk planning, and how TradeQuest describes practice evidence.</p></div>
    <section className="panel glossary-tools" aria-label="Search glossary">
      <label className="glossary-search"><Search size={18} /><span className="sr-only">Search concepts</span><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search a term or explanation…" /></label>
      <div className="glossary-filters" role="group" aria-label="Filter glossary by category">{categories.map(item => <button key={item} className={category === item ? 'glossary-filter active' : 'glossary-filter'} aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</button>)}</div>
      <p className="glossary-count" role="status">{entries.length} {entries.length === 1 ? 'concept' : 'concepts'} found</p>
    </section>
    {entries.length ? <div className="glossary-grid">{entries.map(entry => <article className="panel glossary-entry" key={entry.id}>
      <div className="glossary-entry-top"><span className="glossary-category">{entry.category}</span><BookOpen size={17} aria-hidden="true" /></div>
      <h2>{entry.term}</h2><p>{entry.definition}</p>
      <div className="glossary-example"><strong>Example</strong><p>{entry.example}</p></div>
      {entry.caution && <div className="glossary-caution"><ShieldCheck size={16} /><p>{entry.caution}</p></div>}
    </article>)}</div> : <section className="panel glossary-empty"><BookOpen size={24} /><h2>No matching concepts</h2><p>Try a different search term or choose another category.</p><button className="btn-outline" onClick={() => { setQuery(''); setCategory('All concepts'); }}>Clear search</button></section>}
    <p className="glossary-disclaimer">Educational definitions only. Examples are illustrative, not live market quotes or instructions to trade.</p>
  </div>;
}

export type { GlossaryCategory };

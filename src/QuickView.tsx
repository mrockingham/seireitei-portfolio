// Portfolio at a glance: everything from portfolio-content.ts on one plain, scrollable page, for
// visitors who would rather not walk the whole world. Opens from the landing screen, the header,
// or a shared link to #portfolio.
import { useEffect, useRef } from 'react'
import type { KeyboardEvent } from 'react'
import { about, experience, finalChapter, skills, trainingSection, websites } from './portfolio-content'

const sections = [['about', 'About'], ['experience', 'Experience'], ['skills', 'Skills'], ['websites', 'Websites'], ['built', 'This site'], ['contact', 'Contact']] as const
const imageUrl = (image: string) => /^(https?:)?\/\//.test(image) || image.startsWith('/') ? image : `/assets/websites/${image}`

function trapTab(e: KeyboardEvent<HTMLElement>) {
  if (e.key !== 'Tab') return
  const items = e.currentTarget.querySelectorAll<HTMLElement>('button, a[href]')
  const first = items[0], last = items[items.length - 1]
  if (!first) return
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
}

/** entered: whether the visitor is already in the world (changes the closing button's wording). */
export default function QuickView({ entered, ready, onClose, onEnter }: { entered: boolean; ready: boolean; onClose: () => void; onEnter: () => void }) {
  const body = useRef<HTMLDivElement>(null)
  const close = useRef<HTMLButtonElement>(null)
  useEffect(() => { close.current?.focus({ preventScroll: true }) }, [])
  const jump = (id: string) => body.current?.querySelector(`#quick-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  return <div className="quick-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
    <article className="quick" role="dialog" aria-modal="true" aria-labelledby="quick-title" onKeyDown={trapTab}>
      <div className="quick-head">
        <div>
          <p className="eyebrow">PORTFOLIO AT A GLANCE</p>
          <h1 id="quick-title">{about.name}</h1>
          <p className="quick-role">{about.role} · {about.location}</p>
        </div>
        <button ref={close} className="close" onClick={onClose} aria-label="Close the portfolio">×</button>
        <nav aria-label="Sections">{sections.map(([id, label]) => <button key={id} onClick={() => jump(id)}>{label}</button>)}</nav>
      </div>
      <div className="quick-body" ref={body}>
        <section id="quick-about" aria-labelledby="quick-about-h">
          <h2 id="quick-about-h">About</h2>
          <p>{about.summary}</p>
          {finalChapter.message && <p>{finalChapter.message}</p>}
        </section>

        <section id="quick-experience" aria-labelledby="quick-experience-h">
          <h2 id="quick-experience-h">Experience</h2>
          {experience.map(r => <div className="quick-role-block" key={r.company}>
            <h3>{r.company}</h3>
            <p className="quick-meta">{r.title} · {r.dates}</p>
            <ul className="quick-tags" aria-label="Tech">{r.tech.map(t => <li key={t}>{t}</li>)}</ul>
            <ul className="quick-points">{r.highlights.map(h => <li key={h.title}><b>{h.title}.</b> {h.text}{h.link && <> <a href={h.link.href} target="_blank" rel="noreferrer">{h.link.label} ↗</a></>}</li>)}</ul>
          </div>)}
        </section>

        <section id="quick-skills" aria-labelledby="quick-skills-h">
          <h2 id="quick-skills-h">Skills</h2>
          <div className="quick-skill-grid">{skills.map(g => <div key={g.group}><h3>{g.group}</h3><ul className="quick-tags">{g.items.map(t => <li key={t}>{t}</li>)}</ul></div>)}</div>
        </section>

        <section id="quick-websites" aria-labelledby="quick-websites-h">
          <h2 id="quick-websites-h">Websites</h2>
          <div className="quick-sites">{websites.map(s => <div className="quick-site" key={s.url}>
            {s.image && <a href={s.url} target="_blank" rel="noreferrer" tabIndex={-1} aria-hidden="true"><img src={imageUrl(s.image)} alt="" loading="lazy" /></a>}
            <h3>{s.title}</h3>
            <p>{s.description}</p>
            {s.tags?.length ? <ul className="quick-tags">{s.tags.map(t => <li key={t}>{t}</li>)}</ul> : null}
            <p className="quick-links"><a href={s.url} target="_blank" rel="noreferrer">Visit site ↗</a>{s.repo && <a href={s.repo} target="_blank" rel="noreferrer">Code ↗</a>}</p>
          </div>)}</div>
        </section>

        <section id="quick-built" aria-labelledby="quick-built-h">
          <h2 id="quick-built-h">{trainingSection.heading || 'This site'}</h2>
          {trainingSection.body && <p>{trainingSection.body}</p>}
          <div className="quick-skill-grid">{trainingSection.tools.map(g => <div key={g.group}><h3>{g.group}</h3><ul className="quick-tags">{g.items.map(t => <li key={t}>{t}</li>)}</ul></div>)}</div>
        </section>

        <section id="quick-contact" aria-labelledby="quick-contact-h">
          <h2 id="quick-contact-h">{finalChapter.heading}</h2>
          <ul className="quick-contact">{finalChapter.links.map(l => <li key={l.href}><a href={l.href} target={l.href.startsWith('http') ? '_blank' : undefined} rel="noreferrer">{l.label} ↗</a></li>)}</ul>
        </section>

        <div className="quick-foot">
          <p>This page has everything; the world tells the same story as a journey through a Bleach-inspired Seireitei.</p>
          {entered
            ? <button className="primary" onClick={onClose}>Back to the world <span>→</span></button>
            : <button className="primary" disabled={!ready} onClick={onEnter}>{ready ? 'Enter the world' : 'The world is still loading…'} <span>→</span></button>}
        </div>
      </div>
    </article>
  </div>
}

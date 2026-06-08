import { Counter } from '@v2/components/counter'
import { Reveal } from '@v2/components/reveal'

const stats = [
  { to: 27, suffix: '', label: 'Rooms' },
  { to: 3, suffix: '', label: 'Properties' },
  { to: 10, suffix: '+', label: 'Years' },
  { to: 80, suffix: '+', label: 'Delegates' },
]

export function StatsBar() {
  return (
    <section className="bg-deep-earth" data-cursor="stats">
      <div className="diagonal-texture mx-auto grid max-w-6xl grid-cols-2 gap-y-10 px-6 py-14 md:grid-cols-4 md:divide-x md:divide-terracotta/25 md:px-8">
        {stats.map((s, i) => (
          <Reveal key={s.label} delay={i * 100} className="flex flex-col items-center text-center md:px-4">
            <Counter
              to={s.to}
              suffix={s.suffix}
              duration={1500}
              className="font-display text-5xl font-bold text-white md:text-6xl"
            />
            <span className="mt-2 font-mono text-[11px] uppercase tracking-[0.2em] text-warm-sand">
              {s.label}
            </span>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

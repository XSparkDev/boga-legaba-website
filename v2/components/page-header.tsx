import { Reveal } from './reveal'

export function PageHeader({
  label,
  title,
  subtitle,
}: {
  label: string
  title: string
  subtitle?: string
}) {
  return (
    <section
      className="relative overflow-hidden pb-16 pt-36 md:pb-20 md:pt-44"
      style={{
        background: 'linear-gradient(135deg, #0a0a0a 0%, #262626 50%, #525252 100%)',
      }}
    >
      <div className="diagonal-texture mx-auto max-w-7xl px-6 md:px-8">
        <Reveal>
          <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-warm-sand">
            {label}
          </p>
        </Reveal>
        <Reveal delay={80}>
          <h1 className="mt-4 max-w-4xl font-display text-5xl italic font-bold leading-[0.95] text-white text-balance md:text-7xl">
            {title}
          </h1>
        </Reveal>
        {subtitle ? (
          <Reveal delay={160}>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-cream/80">{subtitle}</p>
          </Reveal>
        ) : null}
      </div>
      <div className="pattern-stripe absolute bottom-0 left-0" />
    </section>
  )
}

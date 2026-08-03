import { cn } from '@v2/lib/utils'

export function SiteImage({
  src,
  alt,
  className,
  priority,
  children,
}: {
  src: string
  alt: string
  className?: string
  priority?: boolean
  children?: React.ReactNode
}) {
  return (
    <div className={cn('relative overflow-hidden', className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="absolute inset-0 h-full w-full object-cover"
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
        decoding={priority ? 'sync' : 'async'}
      />
      {children}
    </div>
  )
}

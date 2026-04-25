import { useState } from 'react'

type SiteImageProps = {
  src: string
  alt: string
  className?: string
  /** Si la imagen principal falla (404, etc.) */
  fallbackSrc?: string
  loading?: 'lazy' | 'eager'
}

export function SiteImage({ src, alt, className, fallbackSrc, loading = 'lazy' }: SiteImageProps) {
  const [active, setActive] = useState(src)

  return (
    <img
      src={active}
      alt={alt}
      loading={loading}
      className={className}
      decoding="async"
      onError={() => {
        if (fallbackSrc && active !== fallbackSrc) {
          setActive(fallbackSrc)
        }
      }}
    />
  )
}

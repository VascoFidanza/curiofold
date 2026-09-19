import type { ReactNode } from 'react'

export function PageFrame({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div
      style={{
        alignItems: 'center',
        display: 'flex',
        minHeight: '100svh',
        padding: 'clamp(1.5rem, 6vw, 6rem)',
      }}
    >
      {children}
    </div>
  )
}

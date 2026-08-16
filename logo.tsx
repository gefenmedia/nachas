export function LogoMark({ className = 'w-8 h-8', color = '#f5c542' }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
      <circle cx="24" cy="24" r="22.5" stroke={color} strokeOpacity="0.15" strokeWidth="1.5" />
      <circle cx="24" cy="24" r="16.5" stroke={color} strokeOpacity="0.3" strokeWidth="1.5" />
      <circle cx="24" cy="24" r="9" stroke={color} strokeWidth="6.5" />
    </svg>
  )
}

export function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark className="w-8 h-8" />
      <span className="font-extrabold text-lg tracking-[0.22em] text-white">NACHAS</span>
    </span>
  )
}

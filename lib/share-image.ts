// Client-side share graphic generator (1200x630 PNG via canvas)

export interface ShareImageOptions {
  emoji: string
  title: string
  lines: string[]
  footer?: string
  filename: string
}

export function downloadShareImage({ emoji, title, lines, footer = 'nachas.app — turn your growth into charity', filename }: ShareImageOptions) {
  if (typeof window === 'undefined') return

  const canvas = document.createElement('canvas')
  canvas.width = 1200
  canvas.height = 630
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  // Background
  ctx.fillStyle = '#0f1a2e'
  ctx.fillRect(0, 0, 1200, 630)

  // Gold accent bar
  ctx.fillStyle = '#f5c542'
  ctx.fillRect(0, 0, 1200, 12)

  // Emoji
  ctx.font = '110px serif'
  ctx.textAlign = 'center'
  ctx.fillText(emoji, 600, 180)

  // Title
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 56px sans-serif'
  wrapText(ctx, title, 600, 270, 1000, 64)

  // Body lines
  ctx.fillStyle = 'rgba(255,255,255,0.75)'
  ctx.font = '34px sans-serif'
  let y = 380
  for (const line of lines) {
    wrapText(ctx, line, 600, y, 1000, 44)
    y += line.length > 45 ? 92 : 52
  }

  // Footer
  ctx.fillStyle = '#f5c542'
  ctx.font = '26px sans-serif'
  ctx.fillText(footer, 600, 590)

  const a = document.createElement('a')
  a.href = canvas.toDataURL('image/png')
  a.download = filename
  a.click()
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const words = text.split(' ')
  let line = ''
  let yy = y
  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, yy)
      line = word
      yy += lineHeight
    } else {
      line = test
    }
  }
  ctx.fillText(line, x, yy)
}

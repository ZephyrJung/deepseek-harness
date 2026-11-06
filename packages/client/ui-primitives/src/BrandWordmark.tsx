import type { IconProps } from './icons/props.ts'

/** Display options for the ZephyR Studio brand wordmark. */
export interface BrandWordmarkProps extends IconProps {
  /** Whether to include the leading whale mark; defaults to true. */
  includeMark?: boolean | undefined
}

/**
 * Render the ZephyR Studio brand: primary name + subtitle line.
 * @param props.size - height in px for the main text (default 18).
 * @param props.className - extra class for layout placement.
 * @returns styled text wordmark (aria-hidden decorative brand art).
 */
export function BrandWordmark({ size = 24, className }: BrandWordmarkProps) {
  return (
    <span className={className}>
      <span
        style={{ fontSize: size * 0.75, fontWeight: 600, letterSpacing: '0.04em', lineHeight: `${size}px`, color: 'currentColor' }}
        aria-hidden="true"
      >
        ZephyR Studio
      </span>
      <br />
      <span
        style={{ fontSize: size * 0.44, fontWeight: 400, letterSpacing: '0.08em', lineHeight: '9px', color: 'var(--dsw-alias-label-secondary)', marginTop: '1px' }}
        aria-hidden="true"
      >
        DEEPSEEK HARNESS
      </span>
    </span>
  )
}

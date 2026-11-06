import { BrandWordmark } from '@deepseek-ai/dsh-client-ui-primitives'
import type { SidebarBrandMarkOwnerProps } from '@deepseek-ai/dsh-client-ui-sidebar/client'

/**
 * Render the ZephyR Studio text brand with "DEEPSEEK HARNESS" subtitle.
 * In collapsed sidebar mode this shows a small icon; in expanded mode it renders
 * the full styled wordmark.
 * @param props.size - height in px for the wordmark (default 24).
 */
export function OfficialBrandMark({ size = 24 }: SidebarBrandMarkOwnerProps) {
  return <BrandWordmark size={size} />
}

/** Empty name slot — mark owns the full wordmark. */
export function OfficialBrandName() {
  return null
}

import { BrandWordmark } from '@deepseek-ai/dsh-client-ui-primitives'

/**
 * Render the official mark; in collapsed sidebar mode this shows nothing, and in
 * expanded mode the full wordmark is rendered by {@link OfficialBrandName}.
 */
export function OfficialBrandMark() {
  return null
}

/**
 * Render the ZephyR Studio brand with "DEEPSEEK HARNESS" as subtitle.
 */
export function OfficialBrandName() {
  return <BrandWordmark />
}

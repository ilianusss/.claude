import type { Register } from 'claude-code'

import { registerSafety } from '../src/safety'
import { registerTypography } from '../src/typography'

export const register: Register = on => {
  registerTypography(on)
  registerSafety(on)
}

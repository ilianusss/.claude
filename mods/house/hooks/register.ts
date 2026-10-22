import type { Register } from 'claude-code'

import { registerTypography } from '../src/typography'

export const register: Register = on => {
  registerTypography(on)
}

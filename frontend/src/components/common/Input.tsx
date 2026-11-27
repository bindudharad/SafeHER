import React from 'react'
import { SafeHERInput, type SafeHERInputProps } from '../ui/SafeHERPrimitives'

export type InputProps = SafeHERInputProps

export const Input = React.forwardRef<HTMLInputElement, InputProps>((props, ref) => (
  <SafeHERInput ref={ref} {...props} />
))

Input.displayName = 'Input'

import React from 'react'
import { SafeHERButton, type SafeHERButtonProps } from '../ui/SafeHERPrimitives'

export type ButtonProps = SafeHERButtonProps

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>((props, ref) => (
  <SafeHERButton ref={ref} {...props} />
))

Button.displayName = 'Button'

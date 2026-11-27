import React from 'react'
import { SafeHERBadge, type SafeHERBadgeProps } from '../ui/SafeHERPrimitives'

export type BadgeProps = SafeHERBadgeProps

export const Badge: React.FC<BadgeProps> = (props) => <SafeHERBadge {...props} />

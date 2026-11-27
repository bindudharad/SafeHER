import React from 'react'
import { SafeHERModal, type SafeHERModalProps } from '../ui/SafeHERPrimitives'

export type ModalProps = SafeHERModalProps

export const Modal: React.FC<ModalProps> = (props) => <SafeHERModal {...props} />

import React from 'react'
import {
  Copy,
  Check,
  Download,
  Eye,
  FileText,
  Image as ImageIcon,
  Video,
  ShieldCheck,
} from 'lucide-react'
import type { Evidence } from '../../types'
import { Badge } from '../common/Badge'
import { formatDate, formatBytes } from '../../utils/crypto'

interface EvidenceCardProps {
  evidence: Evidence
  isSelected?: boolean
  copiedHash: string | null
  onSelect: (evi: Evidence) => void
  onCopyHash: (hash: string) => void
  onDownload: (evi: Evidence) => void
}

export const EvidenceCard: React.FC<EvidenceCardProps> = ({
  evidence,
  isSelected = false,
  copiedHash,
  onSelect,
  onCopyHash,
  onDownload,
}) => {
  const isImage = evidence.file_type.startsWith('image/')
  const isVideo = evidence.file_type.startsWith('video/')

  return (
    <div
      onClick={() => onSelect(evidence)}
      className={`group relative rounded-2xl p-4 bg-[#171D35]/90 border transition-all duration-300 cursor-pointer hover:-translate-y-1 hover:shadow-[0_14px_30px_rgba(8,11,24,0.6),0_0_20px_rgba(139,124,255,0.12)] flex flex-col justify-between gap-3 ${
        isSelected
          ? 'border-[#55D6E8]/60 shadow-[0_0_20px_rgba(85,214,232,0.15)]'
          : 'border-[#A6AEC8]/15 hover:border-[#8B7CFF]/45'
      }`}
    >
      <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-[#8B7CFF]/40 to-transparent" />

      <div className="space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="w-10 h-10 rounded-xl bg-[#0D1224] border border-[#8B7CFF]/25 flex items-center justify-center text-[#8B7CFF] shrink-0">
            {isImage ? (
              <ImageIcon className="w-5 h-5" />
            ) : isVideo ? (
              <Video className="w-5 h-5" />
            ) : (
              <FileText className="w-5 h-5" />
            )}
          </div>
          <Badge variant="safe" size="sm" dot>
            SHA-256
          </Badge>
        </div>

        <div>
          <h4 className="text-sm font-bold text-[#F4F5FF] truncate group-hover:text-[#A99BFF] transition-colors">
            {evidence.original_filename}
          </h4>
          <p className="text-[11px] font-mono text-[#727D9C] mt-0.5">
            {formatBytes(evidence.file_size)} • {formatDate(evidence.upload_timestamp)}
          </p>
        </div>

        <div className="p-2 rounded-lg bg-[#080B18] border border-[#A6AEC8]/15 flex items-center justify-between gap-2">
          <span className="text-[10px] font-mono text-[#55D6E8] truncate">
            {evidence.sha256_hash}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onCopyHash(evidence.sha256_hash)
            }}
            className="text-[#A6AEC8] hover:text-[#F4F5FF] shrink-0"
            title="Copy SHA-256 digest"
          >
            {copiedHash === evidence.sha256_hash ? (
              <Check className="w-3.5 h-3.5 text-[#52D6B2]" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-[#A6AEC8]/10 text-xs">
        <span className="inline-flex items-center gap-1 text-[10px] font-mono text-[#52D6B2]">
          <ShieldCheck className="w-3.5 h-3.5" />
          Digest Verified
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onSelect(evidence)
            }}
            className="p-1.5 rounded-lg bg-[#0D1224] text-[#A6AEC8] hover:text-[#55D6E8] transition-colors"
            title="Inspect metadata"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onDownload(evidence)
            }}
            className="p-1.5 rounded-lg bg-[#0D1224] text-[#A6AEC8] hover:text-[#8B7CFF] transition-colors"
            title="Download record"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

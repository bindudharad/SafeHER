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
import { Interactive3DSurface } from '../ui/Interactive3DSurface'
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
    <Interactive3DSurface
      intensity={6}
      elevateZ={8}
      onClick={() => onSelect(evidence)}
      className={`group rounded-2xl p-4 bg-[#111716]/90 border transition-all duration-300 cursor-pointer flex flex-col justify-between gap-3 ${
        isSelected
          ? 'border-[#d5ff54]/65 shadow-[0_0_24px_rgba(213,255,84,0.18)]'
          : 'border-[rgba(225,239,221,0.15)] hover:border-[#d5ff54]/45'
      }`}
    >
      <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-[#d5ff54]/45 to-transparent" />

      <div className="space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="w-10 h-10 rounded-xl bg-[#0d1110] border border-[#d5ff54]/25 flex items-center justify-center text-[#d5ff54] shrink-0">
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
          <h4 className="text-sm font-bold text-[#f0f2eb] truncate group-hover:text-[#e2ff84] transition-colors">
            {evidence.original_filename}
          </h4>
          <p className="text-[11px] font-mono text-[#929b93] mt-0.5">
            {formatBytes(evidence.file_size)} • {formatDate(evidence.upload_timestamp)}
          </p>
        </div>

        <div className="p-2 rounded-lg bg-[#070908] border border-[rgba(225,239,221,0.15)] flex items-center justify-between gap-2">
          <span className="text-[10px] font-mono text-[#d5ff54] truncate">
            {evidence.sha256_hash}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onCopyHash(evidence.sha256_hash)
            }}
            className="text-[#929b93] hover:text-[#f0f2eb] shrink-0"
            title="Copy SHA-256 digest"
          >
            {copiedHash === evidence.sha256_hash ? (
              <Check className="w-3.5 h-3.5 text-[#a8db35]" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-[rgba(225,239,221,0.10)] text-xs">
        <span className="inline-flex items-center gap-1 text-[10px] font-mono text-[#a8db35]">
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
            className="p-1.5 rounded-lg bg-[#0d1110] text-[#929b93] hover:text-[#d5ff54] transition-colors"
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
            className="p-1.5 rounded-lg bg-[#0d1110] text-[#929b93] hover:text-[#d5ff54] transition-colors"
            title="Download record"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </Interactive3DSurface>
  )
}

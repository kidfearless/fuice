import { Component } from 'react'
import type { FileMetadata } from '@/lib/types'
import { Button } from './ui/button'
import { formatFileSize } from '@/lib/helpers'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faFile,
  faFilePdf,
  faFileArchive,
  faFileAudio,
  faFileVideo,
  faFileImage,
  faDownload,
} from '@fortawesome/free-solid-svg-icons'

interface FileMessageProps {
  metadata: FileMetadata
  fileUrl?: string
}

export class FileMessage extends Component<FileMessageProps> {
  private get metadata() { return this.componentProps.metadata }
  private get fileUrl() { return this.componentProps.fileUrl }

  private handleDownload = () => {
    const fileUrl = this.fileUrl
    const metadata = this.metadata
    if (!fileUrl) return
    const link = document.createElement('a')
    link.href = fileUrl
    link.download = metadata.name
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  private getFileIcon = () => {
    const type = this.metadata.type
    if (type.startsWith('image/')) return faFileImage
    if (type.startsWith('video/')) return faFileVideo
    if (type.startsWith('audio/')) return faFileAudio
    if (type === 'application/pdf') return faFilePdf
    if (type.includes('zip') || type.includes('rar') || type.includes('tar')) return faFileArchive
    return faFile
  }

  render() {
    const metadata = this.metadata
    const fileUrl = this.fileUrl
    const isImage = metadata.type.startsWith('image/')
    const isVideo = metadata.type.startsWith('video/')

    return (
      <div className="max-w-sm rounded-md border border-border bg-card p-3 space-y-2">
        {(isImage && fileUrl) && (
          <img src={fileUrl} alt={metadata.name} className="max-h-64 w-full rounded object-cover" />
        )}
        {(isVideo && fileUrl) && (
          <video src={fileUrl} controls className="max-h-64 w-full rounded" />
        )}
        <div className="flex items-center gap-2">
          <FontAwesomeIcon icon={this.getFileIcon()} className="text-muted-foreground text-[18px]" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{metadata.name}</p>
            <p className="text-xs text-muted-foreground">{formatFileSize(metadata.size)}</p>
          </div>
          {fileUrl && (
            <Button type="button" variant="ghost" size="icon" aria-label="Download file" onClick={this.handleDownload}>
              <FontAwesomeIcon icon={faDownload} />
            </Button>
          )}
        </div>
      </div>
    )
  }
}

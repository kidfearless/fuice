import { useState } from 'react'
import { FileMetadata } from '@/lib/types'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faDownload, faFile, faImage, faFilePdf, faFileLines, faFileZipper, faFileVideo, faFileAudio } from '@fortawesome/free-solid-svg-icons'
import { formatFileSize } from '@/lib/fileTransfer'

interface FileMessageProps {
  metadata: FileMetadata
  fileUrl?: string
}

function getFileIcon(type: string) {
  if (type.startsWith('image/')) return <FontAwesomeIcon icon={faImage} className="text-accent text-[24px]" />
  if (type.startsWith('video/')) return <FontAwesomeIcon icon={faFileVideo} className="text-accent text-[24px]" />
  if (type.startsWith('audio/')) return <FontAwesomeIcon icon={faFileAudio} className="text-accent text-[24px]" />
  if (type.includes('pdf')) return <FontAwesomeIcon icon={faFilePdf} className="text-accent text-[24px]" />
  if (type.includes('text')) return <FontAwesomeIcon icon={faFileLines} className="text-accent text-[24px]" />
  if (type.includes('zip') || type.includes('compressed') || type.includes('archive')) 
    return <FontAwesomeIcon icon={faFileZipper} className="text-accent text-[24px]" />
  return <FontAwesomeIcon icon={faFile} className="text-accent text-[24px]" />
}

export function FileMessage({ metadata, fileUrl }: FileMessageProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const isImage = metadata.type.startsWith('image/')
  const isVideo = metadata.type.startsWith('video/')
  const hasPreview = (isImage || isVideo) && fileUrl

  const handleDownload = () => {
    if (!fileUrl) return
    const a = document.createElement('a')
    a.href = fileUrl
    a.download = metadata.name
    a.click()
  }

  const handleBackgroundClick = () => {
    setDialogOpen(false)
  }

  const handleMediaClick = (e: React.MouseEvent) => {
    e.stopPropagation()
  }

  return (
    <Card className="p-3 max-w-full sm:max-w-[560px]">
      {hasPreview && (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <button className="group relative mb-2 w-full overflow-hidden rounded-md bg-muted/60">
              {isImage && (
                <img
                  src={fileUrl}
                  alt={metadata.name}
                  className="w-full max-h-[360px] object-contain transition-transform duration-200 group-hover:scale-[1.01]"
                />
              )}
              {isVideo && (
                <video
                  src={fileUrl}
                  muted
                  playsInline
                  preload="metadata"
                  className="w-full max-h-[360px] object-contain"
                />
              )}
              <span className="pointer-events-none absolute inset-0 bg-black/0 transition-colors duration-200 group-hover:bg-black/10" />
              <span className="pointer-events-none absolute bottom-2 right-2 rounded-md bg-black/70 px-2 py-1 text-xs text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                Click to expand
              </span>
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-[95vw] sm:max-w-[95vw] w-[95vw] h-[95vh] border-0 bg-black/90 p-6 flex flex-col">
            <div className="mb-3 flex items-center justify-between gap-3 text-white">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{metadata.name}</p>
                <p className="text-xs text-white/70">{formatFileSize(metadata.size)}</p>
              </div>
              {fileUrl && (
                <Button
                  onClick={handleDownload}
                  variant="secondary"
                  size="sm"
                  className="shrink-0 bg-white/10 text-white hover:bg-white/20"
                >
                  <FontAwesomeIcon icon={faDownload} className="mr-2 text-[16px]" />
                  Download
                </Button>
              )}
            </div>
            <div className="flex-1 flex items-center justify-center overflow-hidden cursor-pointer" onClick={handleBackgroundClick}>
              {isImage && (
                <img
                  src={fileUrl}
                  alt={metadata.name}
                  className="max-h-full max-w-full object-contain cursor-default"
                  onClick={handleMediaClick}
                />
              )}
              {isVideo && (
                <video
                  src={fileUrl}
                  controls
                  className="max-h-full max-w-full object-contain cursor-default"
                  onClick={handleMediaClick}
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
      {!hasPreview && isImage && fileUrl && (
        <img
          src={fileUrl}
          alt={metadata.name}
          className="w-full max-h-[360px] rounded-md object-contain bg-muted/60"
        />
      )}
      {!hasPreview && isVideo && fileUrl && (
        <video
          src={fileUrl}
          controls
          className="w-full max-h-[360px] rounded-md object-contain bg-muted/60"
        />
      )}
      <div className="flex items-center gap-3">
        <div className="shrink-0">
          {getFileIcon(metadata.type)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{metadata.name}</p>
          <p className="text-xs text-muted-foreground">{formatFileSize(metadata.size)}</p>
        </div>
        {fileUrl && (
          <Button
            onClick={handleDownload}
            variant="ghost"
            size="icon"
            className="shrink-0"
          >
            <FontAwesomeIcon icon={faDownload} className="text-[18px]" />
          </Button>
        )}
      </div>
    </Card>
  )
}

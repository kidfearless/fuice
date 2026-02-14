import type { Peer, Message } from './types'
import { FileTransferManager } from './fileTransfer'

const BUFFER_HIGH_WATER = 1024 * 1024 // 1 MB – pause sending above this

/** Wait until a data channel's buffered amount drops below the threshold. */
function waitForBufferDrain(dc: RTCDataChannel): Promise<void> {
  return new Promise((resolve, reject) => {
    if (dc.readyState !== 'open') { reject(new Error('channel closed')); return }
    if (dc.bufferedAmount <= BUFFER_HIGH_WATER) { resolve(); return }
    const onLow = () => { cleanup(); resolve() }
    const onClose = () => { cleanup(); reject(new Error('channel closed')) }
    const onError = () => { cleanup(); reject(new Error('channel error')) }
    const cleanup = () => {
      dc.removeEventListener('bufferedamountlow', onLow)
      dc.removeEventListener('close', onClose)
      dc.removeEventListener('error', onError)
    }
    dc.bufferedAmountLowThreshold = BUFFER_HIGH_WATER
    dc.addEventListener('bufferedamountlow', onLow, { once: true })
    dc.addEventListener('close', onClose, { once: true })
    dc.addEventListener('error', onError, { once: true })
  })
}

/** Send a file to all connected peers in chunks. Returns the transfer ID. */
export async function sendFileToPeers(
  peers: Map<string, Peer>,
  fileTransferManager: FileTransferManager,
  file: File,
  _message: Message
): Promise<string> {
  const { metadata, chunks } = await fileTransferManager.prepareFileForTransfer(file)
  const metaMsg = JSON.stringify({ type: 'file-metadata', metadata })

  // Collect peers with open channels once; skip dead ones during sending
  const openPeers = Array.from(peers.values()).filter(
    p => p.dataChannel?.readyState === 'open'
  )

  for (const peer of openPeers) {
    peer.dataChannel!.send(metaMsg)
  }

  for (let i = 0; i < chunks.length; i++) {
    const chunkMsg = JSON.stringify({
      type: 'file-chunk-meta',
      transferId: metadata.transferId,
      chunkIndex: i,
    })

    for (const peer of openPeers) {
      const dc = peer.dataChannel
      if (!dc || dc.readyState !== 'open') continue
      try {
        // Back-pressure: wait for buffer to drain before sending more
        await waitForBufferDrain(dc)
        dc.send(chunkMsg)
        dc.send(chunks[i])
      } catch (err) {
        console.warn(`File chunk ${i} failed for peer ${peer.id}:`, err)
      }
    }
  }

  return metadata.transferId
}

/** Add an audio/video stream's tracks to all peer connections. */
export function addStreamToPeers(peers: Map<string, Peer>, stream: MediaStream) {
  peers.forEach(peer => {
    stream.getTracks().forEach(track => peer.connection?.addTrack(track, stream))
  })
}

/** Remove an audio/video stream's tracks from all peer connections. */
export function removeStreamFromPeers(peers: Map<string, Peer>, stream: MediaStream) {
  peers.forEach(peer => {
    const senders = peer.connection?.getSenders() || []
    senders.forEach(sender => {
      if (stream.getTracks().includes(sender.track!)) peer.connection?.removeTrack(sender)
    })
  })
}

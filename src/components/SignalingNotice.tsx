import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTriangleExclamation, faArrowUpRightFromSquare } from '@fortawesome/free-solid-svg-icons'
import { useState } from 'react'

export function SignalingNotice() {
  const [isDismissed, setIsDismissed] = useState(false)

  if (isDismissed) return null

  return (
    <Alert variant="default" className="border-accent/50 bg-accent/10">
      <FontAwesomeIcon icon={faTriangleExclamation} className="text-accent text-[18px]" />
      <AlertTitle className="font-display">Signaling Server Required</AlertTitle>
      <AlertDescription className="space-y-3">
        <p className="text-sm">
          This app requires a WebSocket signaling server for peer discovery.
          The server only helps peers find each other - all messages, voice, and video 
          are sent directly peer-to-peer.
        </p>
        <div className="flex flex-col gap-2">
          <div className="space-y-1 text-xs">
            <p className="font-medium">Quick Setup (Local Development):</p>
            <code className="block bg-muted px-3 py-2 rounded font-mono text-xs">
              npm install ws<br />
              node signaling-server.js
            </code>
          </div>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => window.open('/SIGNALING_SETUP.md', '_blank')}
              className="text-xs"
            >
              <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="mr-1 text-[14px]" />
              Full Setup Guide
            </Button>
            <Button 
              size="sm" 
              variant="ghost"
              onClick={() => setIsDismissed(true)}
              className="text-xs"
            >
              Dismiss
            </Button>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  )
}

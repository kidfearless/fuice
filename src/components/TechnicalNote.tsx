import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircleInfo, faCircleCheck } from '@fortawesome/free-solid-svg-icons'

export function TechnicalNote() {
  return (
    <div className="fixed bottom-4 right-4 w-80 z-50">
      <Card className="border-accent/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <FontAwesomeIcon icon={faCircleInfo} className="text-accent text-[16px]" />
            Technical Implementation
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs space-y-2 text-muted-foreground">
          <p>
            This app implements <strong>full P2P communication</strong> using:
          </p>
          <ul className="space-y-1 ml-2">
            <li className="flex items-start gap-2">
              <FontAwesomeIcon icon={faCircleCheck} className="text-success mt-0.5 flex-shrink-0 text-[14px]" />
              <span>WebRTC for peer connections</span>
            </li>
            <li className="flex items-start gap-2">
              <FontAwesomeIcon icon={faCircleCheck} className="text-success mt-0.5 flex-shrink-0 text-[14px]" />
              <span>WebSocket signaling server</span>
            </li>
            <li className="flex items-start gap-2">
              <FontAwesomeIcon icon={faCircleCheck} className="text-success mt-0.5 flex-shrink-0 text-[14px]" />
              <span>IndexedDB for offline storage</span>
            </li>
            <li className="flex items-start gap-2">
              <FontAwesomeIcon icon={faCircleCheck} className="text-success mt-0.5 flex-shrink-0 text-[14px]" />
              <span>Service Workers for PWA</span>
            </li>
            <li className="flex items-start gap-2">
              <FontAwesomeIcon icon={faCircleCheck} className="text-success mt-0.5 flex-shrink-0 text-[14px]" />
              <span>MediaStream API for audio/video</span>
            </li>
          </ul>
          <Alert className="mt-2">
            <AlertDescription className="text-xs">
              <strong>Setup Required:</strong> The signaling server must be running 
              for peer discovery. See <code className="bg-muted px-1 py-0.5 rounded">SIGNALING_SETUP.md</code> 
              for deployment instructions.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  )
}

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircleInfo, faDisplay, faMicrophone, faHashtag, faUsers, faImage } from '@fortawesome/free-solid-svg-icons'

export function HelpPanel() {
  return (
    <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
      <Alert>
        <FontAwesomeIcon icon={faCircleInfo} className="text-accent text-[18px]" />
        <AlertDescription>
          <strong>P2P Chat</strong> uses WebRTC for direct peer-to-peer connections. 
          All messages, voice, and screen shares happen directly between users without servers.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FontAwesomeIcon icon={faHashtag} className="text-[20px]" />
            Text Channels
          </CardTitle>
          <CardDescription>
            Send messages that sync across all connected peers in real-time
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p>• Messages are stored locally in your browser</p>
          <p>• Offline messages sync when peers reconnect</p>
          <p>• All chat history persists between sessions</p>
          <p>• Use <code>/gif [search]</code> to send GIFs</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FontAwesomeIcon icon={faImage} className="text-[20px]" />
            GIF Commands
          </CardTitle>
          <CardDescription>
            Share animated GIFs using chat commands
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p>• <code>/gif [search]</code> - Search any provider</p>
          <p>• <code>/giphy [search]</code> - Search Giphy</p>
          <p>• <code>/tenor [search]</code> - Search Tenor</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FontAwesomeIcon icon={faMicrophone} className="text-[20px]" />
            Voice Channels
          </CardTitle>
          <CardDescription>
            Real-time voice communication with multiple peers
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p>• Click "Join Voice Channel" to start</p>
          <p>• Use mute/deafen controls during calls</p>
          <p>• Audio streams directly peer-to-peer</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FontAwesomeIcon icon={faDisplay} className="text-[20px]" />
            Screen Sharing
          </CardTitle>
          <CardDescription>
            Share your screen with connected peers
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p>• Available in voice channels</p>
          <p>• Select screen, window, or tab to share</p>
          <p>• Video streams via WebRTC</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FontAwesomeIcon icon={faUsers} className="text-[20px]" />
            Connecting Peers
          </CardTitle>
          <CardDescription>
            How to invite others to your room
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p>1. Create a room to get a unique code</p>
          <p>2. Share the code with friends</p>
          <p>3. They enter the code to join</p>
          <p>4. Connections establish automatically</p>
        </CardContent>
      </Card>

      <Alert>
        <FontAwesomeIcon icon={faCircleInfo} className="text-[18px]" />
        <AlertDescription className="text-xs">
          <strong>Privacy Note:</strong> Since all communication is peer-to-peer, 
          your data never touches a server. Messages are only stored on your device 
          and the devices of connected peers.
        </AlertDescription>
      </Alert>
    </div>
  )
}

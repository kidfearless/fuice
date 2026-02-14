import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUsers, faArrowsRotate } from '@fortawesome/free-solid-svg-icons'
import { clearCacheAndUpdate } from '@/lib/sw-register'
import { toast } from 'sonner'

interface UsernameFormProps {
  onSubmit: (username: string) => void
}

export function UsernameForm({ onSubmit }: UsernameFormProps) {
  const [username, setUsername] = useState('')

  const handleSubmit = () => {
    if (username.trim()) onSubmit(username.trim())
  }

  return (
    <div className="min-h-screen gradient-mesh flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <FontAwesomeIcon icon={faUsers} className="text-accent text-[48px]" />
          </div>
          <CardTitle className="text-2xl">Welcome to P2P Chat</CardTitle>
          <CardDescription>
            Decentralized, peer-to-peer communication without servers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Choose your username</Label>
              <Input
                id="username"
                placeholder="Enter username..."
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                autoFocus
              />
            </div>
            <Button onClick={handleSubmit} className="w-full" disabled={!username.trim()}>
              Continue
            </Button>
            <Button
              onClick={() => { toast.info('Clearing cache and updating...'); clearCacheAndUpdate() }}
              variant="outline" size="sm" className="w-full"
            >
              <FontAwesomeIcon icon={faArrowsRotate} className="mr-2 text-[16px]" />
              Check for Updates
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

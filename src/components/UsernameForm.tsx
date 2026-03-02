import React, { Component } from 'react'
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

interface UsernameFormState {
  username: string
}

export class UsernameForm extends Component<UsernameFormProps, UsernameFormState> {
  constructor(props: UsernameFormProps) {
    super(props)
    this.state = {
      username: '',
    }
  }

  private get username() { return this.state.username }
  private set username(username: string) { this.setState({ username }) }
  private get onSubmit() { return this.componentProps.onSubmit }

  handleSubmit = () => {
    const username = this.username
    if (username.trim()) this.onSubmit(username.trim())
  }

  render() {
    const username = this.username

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
                  onChange={(e) => { this.username = e.target.value }}
                  onKeyDown={(e) => e.key === 'Enter' && this.handleSubmit()}
                  autoFocus
                />
              </div>
              <Button onClick={this.handleSubmit} className="w-full" disabled={!username.trim()}>
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
}

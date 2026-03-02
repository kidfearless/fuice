import React, { Component } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUsers, faPlus, faArrowsRotate } from '@fortawesome/free-solid-svg-icons'
import { clearCacheAndUpdate } from '@/lib/sw-register'
import { toast } from 'sonner'

interface RoomFormProps
{
	username: string
	onCreateRoom: (name: string) => Promise<void>
	onJoinRoom: (code: string) => Promise<void>
}

interface RoomFormState
{
	roomName: string
	roomCode: string
	isCreating: boolean
	isJoining: boolean
}

export class RoomForm extends Component<RoomFormProps, RoomFormState>
{
	constructor(props: RoomFormProps)
	{
		super(props)
		this.state = {
			roomName: '',
			roomCode: '',
			isCreating: false,
			isJoining: false,
		}
	}

	private get roomName() { return this.state.roomName }
	private set roomName(roomName: string) { this.setState({ roomName }) }
	private get roomCode() { return this.state.roomCode }
	private set roomCode(roomCode: string) { this.setState({ roomCode }) }
	private get isCreating() { return this.state.isCreating }
	private set isCreating(isCreating: boolean) { this.setState({ isCreating }) }
	private get isJoining() { return this.state.isJoining }
	private set isJoining(isJoining: boolean) { this.setState({ isJoining }) }
	private get username() { return this.componentProps.username }
	private get onCreateRoom() { return this.componentProps.onCreateRoom }
	private get onJoinRoom() { return this.componentProps.onJoinRoom }

	handleCreate = async () =>
	{
		if (!this.roomName.trim()) return
		this.isCreating = true
		try { await this.onCreateRoom(this.roomName.trim()) }
		catch (e) { console.error('Failed to create room:', e) }
		finally { this.isCreating = false }
	}

	handleJoin = async () =>
	{
		if (!this.roomCode.trim()) return
		this.isJoining = true
		try { await this.onJoinRoom(this.roomCode.trim().toUpperCase()) }
		catch (e) { console.error('Failed to join room:', e) }
		finally { this.isJoining = false }
	}

	render()
	{
		const username = this.username
		const roomName = this.roomName
		const roomCode = this.roomCode
		const isCreating = this.isCreating
		const isJoining = this.isJoining

		return (
			<div className="min-h-screen gradient-mesh flex items-center justify-center p-4">
				<div className="w-full max-w-md space-y-4">
					<Card>
						<CardHeader className="text-center">
							<CardTitle className="text-2xl">Hi, {username}!</CardTitle>
							<CardDescription>Create a new room or join an existing one</CardDescription>
						</CardHeader>
						<CardContent>
							<Tabs defaultValue="create" className="w-full">
								<TabsList className="grid w-full grid-cols-2">
									<TabsTrigger value="create">Create Room</TabsTrigger>
									<TabsTrigger value="join">Join Room</TabsTrigger>
								</TabsList>

								<TabsContent value="create" className="space-y-4">
									<div className="space-y-2">
										<Label htmlFor="room-name">Room Name</Label>
										<Input id="room-name" placeholder="My Awesome Room" value={roomName}
											onChange={(e) => { this.roomName = e.target.value }}
											onKeyDown={(e) => e.key === 'Enter' && this.handleCreate()} />
									</div>
									<Button onClick={this.handleCreate} className="w-full" disabled={!roomName.trim() || isCreating}>
										<FontAwesomeIcon icon={faPlus} className="mr-2 text-[20px]" />
										{isCreating ? 'Creating...' : 'Create Room'}
									</Button>
									<p className="text-xs text-muted-foreground text-center">
										You'll receive a code to share with others
									</p>
								</TabsContent>

								<TabsContent value="join" className="space-y-4">
									<div className="space-y-2">
										<Label htmlFor="room-code">Room Code</Label>
										<Input id="room-code" placeholder="ABC123" value={roomCode}
											onChange={(e) => { this.roomCode = e.target.value.toUpperCase() }}
											onKeyDown={(e) => e.key === 'Enter' && this.handleJoin()}
											className="uppercase font-mono" />
									</div>
									<Button onClick={this.handleJoin} className="w-full" disabled={!roomCode.trim() || isJoining}>
										<FontAwesomeIcon icon={faUsers} className="mr-2 text-[20px]" />
										{isJoining ? 'Joining...' : 'Join Room'}
									</Button>
									<p className="text-xs text-muted-foreground text-center">
										Enter the 6-character code from your friend
									</p>
								</TabsContent>
							</Tabs>
							<div className="mt-4 pt-4 border-t">
								<Button onClick={() => { toast.info('Clearing cache and updating...'); clearCacheAndUpdate() }}
									variant="outline" size="sm" className="w-full">
									<FontAwesomeIcon icon={faArrowsRotate} className="mr-2 text-[16px]" />
									Check for Updates
								</Button>
							</div>
						</CardContent>
					</Card>
				</div>
			</div>
		)
	}
}

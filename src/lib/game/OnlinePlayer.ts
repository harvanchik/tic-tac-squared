// filepath: c:\Users\Jake\Websites\tic-tac-squared\src\lib\game\OnlinePlayer.ts
import type { CellValue, GameRules, Player } from './GameState';

// PeerJS will be imported dynamically to avoid SSR issues

// Interface for a multiplayer move message
export interface MoveMessage {
	type: 'move';
	boardIndex: number;
	cellIndex: number;
	player: Player;
}

// Interface for a game settings message
export interface SettingsMessage {
	type: 'settings';
	gameRules: GameRules;
}

// Interface for game state synchronization
export interface SyncMessage {
	type: 'sync';
	boards: CellValue[][][];
	boardWinners: CellValue[];
	currentPlayer: Player;
	activeBoard: number | null;
	gameRules: GameRules;
}

// Interface for connection status messages
export interface StatusMessage {
	type: 'status';
	status: 'connected' | 'disconnected' | 'game-start' | 'forfeit' | 'game-full';
}

// Union type for all message types
export type MultiplayerMessage = MoveMessage | SettingsMessage | SyncMessage | StatusMessage;

// Connection states
export type ConnectionStatus = 'disconnected' | 'connecting' | 'waiting' | 'connected' | 'error';

// Role in the game (host or guest)
export type PlayerRole = 'host' | 'guest';

// Game code format: 5 uppercase alphanumeric characters
const GAME_CODE_LENGTH = 5;
const GAME_CODE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

/**
 * OnlinePlayer - Manages peer-to-peer connections for online multiplayer
 */
export class OnlinePlayer {
	private peer: any; // PeerJS instance
	private connection: any; // DataConnection
	private gameCode: string | null = null;
	private callbacks: {
		onStatusChange?: (status: ConnectionStatus, error?: string) => void;
		onRemoteMove?: (boardIndex: number, cellIndex: number) => void;
		onRemoteSettings?: (gameRules: GameRules) => void;
		onRemoteSync?: (syncData: Partial<SyncMessage>) => void;
		onGameStart?: () => void;
		onPlayerDisconnect?: () => void;
	} = {};
	private status: ConnectionStatus = 'disconnected';
	private role: PlayerRole | null = null;
	private localPlayer: Player | null = null;

	/**
	 * Initialize the OnlinePlayer with callback functions
	 */
	constructor(callbacks: {
		onStatusChange?: (status: ConnectionStatus, error?: string) => void;
		onRemoteMove?: (boardIndex: number, cellIndex: number) => void;
		onRemoteSettings?: (gameRules: GameRules) => void;
		onRemoteSync?: (syncData: Partial<SyncMessage>) => void;
		onGameStart?: () => void;
		onPlayerDisconnect?: () => void;
	}) {
		this.callbacks = callbacks;
	}

	/**
	 * Initialize the PeerJS connection
	 */
	async initialize(customId?: string): Promise<void> {
		try {
			// Dynamically import PeerJS to avoid SSR issues
			const { Peer } = await import('peerjs');

			console.log(`[OnlinePlayer] Initializing PeerJS${customId ? ` with ID: ${customId}` : ''}`);

			// Create a new Peer instance with STUN/TURN servers for NAT traversal
			// If customId is provided, use it as the peer ID
			this.peer = new Peer(customId, {
				debug: 3, // Set to highest debug level to see all logs
				config: {
					iceServers: [
						{ urls: 'stun:stun.l.google.com:19302' },
						{
							urls: 'turn:global.turn.twilio.com:3478',
							username: 'someusername', // Note: In a real app, you'd use your own TURN credentials
							credential: 'somepassword'
						}
					]
				}
			});

			// Set up event listeners
			this.peer.on('open', (id: string) => {
				console.log(`[OnlinePlayer] PeerJS connection established with ID: ${id}`);

				// For the host, once we have an ID, we're ready to receive connections
				if (this.role === 'host') {
					this.updateStatus('waiting');
					console.log(`[OnlinePlayer] Host (${id}) is waiting for connections`);
				}
			});

			this.peer.on('error', (err: any) => {
				console.error('[OnlinePlayer] PeerJS error:', err);
				this.updateStatus('error', err.message);
			});

			this.peer.on('connection', (conn: any) => {
				console.log('[OnlinePlayer] Received connection from peer:', conn.peer);

				// Only accept connections when we're the host
				if (this.role !== 'host') {
					console.warn('[OnlinePlayer] Received connection attempt but not in host role. Closing.');
					conn.close();
					return;
				}

				// Check if we already have an active connection
				if (this.connection && this.connection.open) {
					console.warn(
						'[OnlinePlayer] A third player tried to join the game. Rejecting connection.'
					);

					// Send a message to the connecting peer about game being full
					conn.on('open', () => {
						conn.send({
							type: 'status',
							status: 'game-full'
						});
						// Close the connection after sending the message
						setTimeout(() => conn.close(), 500);
					});
					return;
				}

				// Set up connection handlers
				this.setupConnection(conn);
				this.connection = conn;

				// Host is X, guest is O
				this.localPlayer = 'X';

				// Notify status change to connected
				this.updateStatus('connected');

				console.log('[OnlinePlayer] Host established connection with guest. Ready to start game.');
			});
		} catch (error) {
			console.error('[OnlinePlayer] Failed to initialize PeerJS:', error);
			this.updateStatus('error', 'Failed to initialize peer connection');
			throw error;
		}
	}

	/**
	 * Generate a random game code
	 */
	generateGameCode(): string {
		let result = '';
		for (let i = 0; i < GAME_CODE_LENGTH; i++) {
			result += GAME_CODE_CHARS.charAt(Math.floor(Math.random() * GAME_CODE_CHARS.length));
		}
		return result;
	}

	/**
	 * Create a new game as host
	 */
	async createGame(): Promise<string> {
		try {
			// Generate a random game code
			this.gameCode = this.generateGameCode();
			this.role = 'host';

			// If peer exists, destroy it first to create a new one with the custom ID
			if (this.peer) {
				this.peer.destroy();
				this.peer = null;
			}

			// Initialize peer with the game code as the ID
			await this.initialize(this.gameCode);

			// Update status to waiting for opponent
			this.updateStatus('waiting');

			return this.gameCode;
		} catch (error) {
			console.error('Failed to create game:', error);
			this.updateStatus('error', error instanceof Error ? error.message : 'Unknown error');
			throw error;
		}
	}

	/**
	 * Join an existing game as guest
	 */
	async joinGame(gameCode: string): Promise<void> {
		try {
			// Store the game code
			this.gameCode = gameCode.toUpperCase(); // Ensure uppercase
			this.role = 'guest';
			this.updateStatus('connecting');

			console.log(`[OnlinePlayer] Guest attempting to join game with code: ${this.gameCode}`);

			// If peer exists, destroy it first to create a new one
			if (this.peer) {
				this.peer.destroy();
				this.peer = null;
			}

			// Initialize peer with a random ID (no custom ID needed for guest)
			await this.initialize();

			// Wait until the peer is open before trying to connect
			if (!this.peer.open) {
				console.log('[OnlinePlayer] Waiting for peer to open before connecting');
				await new Promise<void>((resolve) => {
					this.peer.on('open', () => {
						console.log('[OnlinePlayer] Guest peer opened, proceeding with connection');
						resolve();
					});
				});
			}

			// Connect to the host
			console.log(`[OnlinePlayer] Guest connecting to host with ID: ${this.gameCode}`);
			const conn = this.peer.connect(this.gameCode, {
				reliable: true // Ensure reliable connection
			});

			if (!conn) {
				throw new Error('Could not connect to game');
			}

			// Wait for connection to be established
			await new Promise<void>((resolve, reject) => {
				// Handle connection opening
				conn.on('open', () => {
					console.log('[OnlinePlayer] Connection established with host');
					resolve();
				});

				// Handle connection errors
				conn.on('error', (err: any) => {
					console.error('[OnlinePlayer] Connection error:', err);
					reject(new Error('Connection error: ' + err.message));
				});

				// Set a timeout in case connection never opens
				setTimeout(() => {
					reject(new Error('Connection timed out'));
				}, 10000); // 10 second timeout
			});

			// Now that connection is established, set up all event handlers
			this.setupConnection(conn);
			this.connection = conn;

			// Guest is always O
			this.localPlayer = 'O';

			// Update status and immediately send a connected message
			this.updateStatus('connected');
			this.sendMessage({
				type: 'status',
				status: 'connected'
			});

			console.log('[OnlinePlayer] Guest successfully joined game');
		} catch (error) {
			console.error('[OnlinePlayer] Failed to join game:', error);
			this.updateStatus('error', error instanceof Error ? error.message : 'Failed to join game');
			throw error;
		}
	}

	/**
	 * Set up event listeners for data connection
	 */
	private setupConnection(conn: any): void {
		conn.on('open', () => {
			console.log(`[OnlinePlayer] Connection established with peer as ${this.role}`);
			this.updateStatus('connected');

			// When the guest connects to the host, set the player roles
			if (this.role === 'guest') {
				// Guest is always O
				this.localPlayer = 'O';

				// Notify host that guest has connected
				this.sendMessage({
					type: 'status',
					status: 'connected'
				});

				console.log(`[OnlinePlayer] Guest (Player O) connected to host`);
			} else if (this.role === 'host') {
				// Host is always X
				this.localPlayer = 'X';
				console.log(`[OnlinePlayer] Host (Player X) ready - waiting for guest`);
			}
		});

		conn.on('data', (data: MultiplayerMessage) => {
			console.log(`[OnlinePlayer] Received message as ${this.role}:`, data);
			this.handleIncomingMessage(data);
		});

		conn.on('close', () => {
			console.log('[OnlinePlayer] Connection closed');

			// Notify about disconnection
			if (this.callbacks.onPlayerDisconnect) {
				this.callbacks.onPlayerDisconnect();
			}

			this.updateStatus('disconnected');
			this.connection = null;
		});

		conn.on('error', (err: any) => {
			console.error('[OnlinePlayer] Connection error:', err);
			this.updateStatus('error', err.message);
		});
	}

	/**
	 * Handle incoming messages from remote player
	 */
	private handleIncomingMessage(message: MultiplayerMessage): void {
		console.log(`[OnlinePlayer] Processing message as ${this.role}:`, message);

		switch (message.type) {
			case 'move':
				console.log(
					`[OnlinePlayer] Remote player made move: board ${message.boardIndex}, cell ${message.cellIndex}`
				);
				if (this.callbacks.onRemoteMove) {
					this.callbacks.onRemoteMove(message.boardIndex, message.cellIndex);
				}
				break;

			case 'settings':
				console.log(`[OnlinePlayer] Received game settings:`, message.gameRules);
				if (this.callbacks.onRemoteSettings) {
					this.callbacks.onRemoteSettings(message.gameRules);
				}
				break;

			case 'sync':
				console.log(`[OnlinePlayer] Received game state sync`);
				if (this.callbacks.onRemoteSync) {
					this.callbacks.onRemoteSync(message);
				}
				break;

			case 'status':
				console.log(`[OnlinePlayer] Received status update: ${message.status}`);

				if (message.status === 'connected') {
					// Guest has connected to host, notify host
					if (this.role === 'host') {
						console.log(`[OnlinePlayer] Host received connection from guest`);

						// Send game start message to guest
						this.sendMessage({
							type: 'status',
							status: 'game-start'
						});

						// Trigger game start callback
						if (this.callbacks.onGameStart) {
							this.callbacks.onGameStart();
						}
					}
				} else if (message.status === 'game-start') {
					console.log(
						`[OnlinePlayer] Game is starting, ${this.role} is playing as ${this.localPlayer}`
					);
					if (this.callbacks.onGameStart) {
						this.callbacks.onGameStart();
					}
				} else if (message.status === 'forfeit' && this.callbacks.onPlayerDisconnect) {
					this.callbacks.onPlayerDisconnect();
				} else if (message.status === 'game-full') {
					// Handle the case when trying to join a game that's already full
					console.log('[OnlinePlayer] Received game-full message - game already has 2 players');
					this.updateStatus('error', 'This game already has 2 players');

					// Disconnect since we can't join
					if (this.connection) {
						this.connection.close();
						this.connection = null;
					}
				}
				break;
		}
	}

	/**
	 * Send a message to the remote player
	 */
	sendMessage(message: MultiplayerMessage): void {
		if (this.connection && this.connection.open) {
			console.log(`[OnlinePlayer] Sending message as ${this.role}:`, message);
			this.connection.send(message);
		} else {
			console.warn(`[OnlinePlayer] Cannot send message, connection not open`, message);
		}
	}

	/**
	 * Send a move to the remote player
	 */
	sendMove(boardIndex: number, cellIndex: number, player: Player): void {
		this.sendMessage({
			type: 'move',
			boardIndex,
			cellIndex,
			player
		});
	}

	/**
	 * Send game settings to the remote player
	 */
	sendSettings(gameRules: GameRules): void {
		this.sendMessage({
			type: 'settings',
			gameRules
		});
	}

	/**
	 * Send game state sync to the remote player
	 */
	sendSync(data: Omit<SyncMessage, 'type'>): void {
		this.sendMessage({
			type: 'sync',
			...data
		});
	}

	/**
	 * Update connection status and notify via callback
	 */
	private updateStatus(status: ConnectionStatus, error?: string): void {
		this.status = status;

		if (this.callbacks.onStatusChange) {
			this.callbacks.onStatusChange(status, error);
		}
	}

	/**
	 * Get current connection status
	 */
	getStatus(): ConnectionStatus {
		return this.status;
	}

	/**
	 * Get current player role (host/guest)
	 */
	getRole(): PlayerRole | null {
		return this.role;
	}

	/**
	 * Get local player marker (X/O)
	 */
	getLocalPlayer(): Player | null {
		return this.localPlayer;
	}

	/**
	 * Check if it's the local player's turn
	 */
	isLocalPlayerTurn(currentPlayer: Player): boolean {
		return currentPlayer === this.localPlayer;
	}

	/**
	 * Disconnect from the current game
	 */
	disconnect(): void {
		// Send forfeit message if connected
		if (this.connection && this.connection.open) {
			this.sendMessage({
				type: 'status',
				status: 'forfeit'
			});
		}

		// Close connection
		if (this.connection) {
			this.connection.close();
			this.connection = null;
		}

		// Destroy peer
		if (this.peer) {
			this.peer.destroy();
			this.peer = null;
		}

		// Reset state
		this.gameCode = null;
		this.role = null;
		this.localPlayer = null;
		this.updateStatus('disconnected');
	}
}

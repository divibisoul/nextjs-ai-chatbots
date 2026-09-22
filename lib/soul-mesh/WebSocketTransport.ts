export class SoulMeshWebSocketTransport {
  private socket: WebSocket | null = null;

  constructor(private readonly url: string) {}

  connect(onMessage: (message: unknown) => void): Promise<void> {
    const socket = new WebSocket(this.url);
    this.socket = socket;
    return new Promise((resolve, reject) => {
      socket.onopen = () => resolve();
      socket.onerror = () => reject(new Error('SOUL_MESH_WS_ERROR'));
      socket.onmessage = (event) => {
        try {
          onMessage(JSON.parse(event.data as string));
        } catch {
          onMessage(event.data);
        }
      };
    });
  }

  send(message: unknown): void {
    const socket = this.socket;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      throw new Error('SOUL_MESH_WS_NOT_OPEN');
    }
    socket.send(JSON.stringify(message));
  }

  close(): void {
    this.socket?.close();
    this.socket = null;
  }
}

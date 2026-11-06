import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OnGatewayConnection, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { AuthUser } from '../auth/auth.types';
import { UserRole } from '../entities';

export type LiveEvent = 'queue.updated' | 'passengers.updated';

/**
 * Pushes changes to every open screen at a boosteejo, so two managers never see different queues.
 * The Angular app connects with: io(url, { auth: { token } }) and listens for 'queue.updated' / 'passengers.updated'.
 */
@WebSocketGateway({ cors: { origin: process.env.CORS_ORIGIN?.split(',') ?? true } })
export class LiveGateway implements OnGatewayConnection {
  private readonly log = new Logger(LiveGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(private readonly jwt: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token as string | undefined;
      if (!token) throw new Error('no token');
      const user = await this.jwt.verifyAsync<AuthUser>(token);
      if (user.role === UserRole.ADMIN) client.join('admins');
      if (user.stationId) client.join(`station:${user.stationId}`);
    } catch {
      this.log.debug(`Rejected socket ${client.id}`);
      client.disconnect(true);
    }
  }

  notifyStation(stationId: number, event: LiveEvent, payload: Record<string, unknown>) {
    this.server?.to(`station:${stationId}`).to('admins').emit(event, { stationId, ...payload });
  }
}

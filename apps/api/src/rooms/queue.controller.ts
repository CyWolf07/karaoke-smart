import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { QueueDto, SearchResultDto } from '@ks/shared-types';
import {
  addToQueueSchema,
  advanceQueueSchema,
  type AddToQueueInput,
  type AdvanceQueueInput,
} from '@ks/validation';
import type { Request } from 'express';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { QueueService } from './queue.service';

const token = (req: Request) => {
  const [scheme, t] = (req.headers.authorization ?? '').split(' ');
  return scheme === 'Bearer' ? t : undefined;
};

/** Cola y búsqueda. Aceptan token de anfitrión (miembro) o de invitado de la sala. */
@ApiTags('queue')
@ApiBearerAuth()
@Controller({ path: 'rooms/:roomId', version: '1' })
export class QueueController {
  constructor(
    private readonly queue: QueueService,
    private readonly realtime: RealtimeGateway,
  ) {}

  @Get('queue')
  async get(
    @Param('roomId', new ParseUUIDPipe()) roomId: string,
    @Req() req: Request,
  ): Promise<QueueDto> {
    await this.queue.actor(token(req), roomId);
    return this.queue.get(roomId);
  }

  @Post('queue')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: 'Pedir una canción de YouTube (ID o enlace ya convertido a ID)' })
  @ApiBody({ schema: { example: { videoId: 'dQw4w9WgXcQ' } } })
  async add(
    @Param('roomId', new ParseUUIDPipe()) roomId: string,
    @Req() req: Request,
    @Body(new ZodValidationPipe(addToQueueSchema)) body: AddToQueueInput,
  ): Promise<QueueDto> {
    const actor = await this.queue.actor(token(req), roomId);
    const q = await this.queue.add(roomId, actor, body.videoId);
    this.realtime.queueUpdated(roomId, q.version);
    return q;
  }

  @Delete('queue/:itemId')
  async remove(
    @Param('roomId', new ParseUUIDPipe()) roomId: string,
    @Param('itemId', new ParseUUIDPipe()) itemId: string,
    @Req() req: Request,
  ): Promise<QueueDto> {
    const actor = await this.queue.actor(token(req), roomId);
    const q = await this.queue.remove(roomId, actor, itemId);
    this.realtime.queueUpdated(roomId, q.version);
    return q;
  }

  @Post('queue/advance')
  @HttpCode(200)
  @ApiOperation({ summary: 'Siguiente canción (anfitrión). fromItemId evita avanzar dos veces.' })
  async advance(
    @Param('roomId', new ParseUUIDPipe()) roomId: string,
    @Req() req: Request,
    @Body(new ZodValidationPipe(advanceQueueSchema)) body: AdvanceQueueInput,
  ): Promise<QueueDto> {
    const actor = await this.queue.actor(token(req), roomId);
    const q = await this.queue.advance(roomId, actor, body.fromItemId);
    this.realtime.queueUpdated(roomId, q.version);
    return q;
  }

  @Get('search')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Buscar en YouTube (requiere YOUTUBE_API_KEY; si no, 503)' })
  async search(
    @Param('roomId', new ParseUUIDPipe()) roomId: string,
    @Req() req: Request,
    @Query('q') q = '',
  ): Promise<SearchResultDto[]> {
    await this.queue.actor(token(req), roomId);
    return this.queue.search(String(q));
  }
}

import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { GuestSession, Role, RoomDto } from '@ks/shared-types';
import {
  createRoomSchema,
  joinRoomSchema,
  type CreateRoomInput,
  type JoinRoomInput,
} from '@ks/validation';
import type { Request } from 'express';
import { CurrentUser, JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AccessTokenPayload } from '../auth/auth.service';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { OrgMemberGuard } from '../organizations/organizations.module';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { RoomsService } from './rooms.service';

const bearer = (req: Request) => {
  const [scheme, token] = (req.headers.authorization ?? '').split(' ');
  if (scheme !== 'Bearer' || !token) throw new UnauthorizedException('Token requerido');
  return token;
};

@ApiTags('rooms')
@Controller({ version: '1' })
export class RoomsController {
  constructor(
    private readonly rooms: RoomsService,
    private readonly realtime: RealtimeGateway,
  ) {}

  @Post('organizations/:orgId/rooms')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, OrgMemberGuard)
  @ApiOperation({ summary: 'Crear sala (owner, admin o host). Devuelve el código de unión.' })
  @ApiBody({ schema: { example: { name: 'Sala principal' } } })
  create(
    @Param('orgId', new ParseUUIDPipe()) orgId: string,
    @Req() req: Request & { membershipRole?: Role },
    @CurrentUser() user: AccessTokenPayload,
    @Body(new ZodValidationPipe(createRoomSchema)) body: CreateRoomInput,
  ): Promise<RoomDto> {
    return this.rooms.create(orgId, user.sub, req.membershipRole as Role, body.name);
  }

  @Get('organizations/:orgId/rooms')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, OrgMemberGuard)
  @ApiOperation({ summary: 'Salas abiertas de la organización' })
  list(@Param('orgId', new ParseUUIDPipe()) orgId: string): Promise<RoomDto[]> {
    return this.rooms.list(orgId);
  }

  @Get('rooms/:roomId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  get(
    @Param('roomId', new ParseUUIDPipe()) roomId: string,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<RoomDto> {
    return this.rooms.get(user.sub, roomId);
  }

  @Post('rooms/:roomId/code')
  @HttpCode(200)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Generar un código nuevo (invalida el anterior y su QR)' })
  regenerate(
    @Param('roomId', new ParseUUIDPipe()) roomId: string,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<RoomDto> {
    return this.rooms.regenerateCode(user.sub, roomId);
  }

  @Post('rooms/:roomId/close')
  @HttpCode(200)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async close(
    @Param('roomId', new ParseUUIDPipe()) roomId: string,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<RoomDto> {
    const dto = await this.rooms.close(user.sub, roomId);
    await this.realtime.roomClosed(roomId);
    return dto;
  }

  @Post('rooms/join')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Unirse como invitado con el código (o el QR). Sin cuenta.' })
  @ApiBody({ schema: { example: { code: 'ABC234', nickname: 'Ana' } } })
  async join(
    @Body(new ZodValidationPipe(joinRoomSchema)) body: JoinRoomInput,
  ): Promise<GuestSession> {
    const session = await this.rooms.join(body);
    await this.realtime.broadcastPresence(session.room.id);
    return session;
  }

  @Post('rooms/leave')
  @HttpCode(204)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'El invitado sale de la sala (token de invitado)' })
  async leave(@Req() req: Request): Promise<void> {
    const guest = await this.rooms.verifyGuest(bearer(req));
    await this.rooms.leave(guest.sub);
    await this.realtime.broadcastPresence(guest.roomId);
  }
}

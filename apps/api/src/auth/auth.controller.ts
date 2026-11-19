import { Body, Controller, Get, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { AuthResponse, UserDto } from '@ks/shared-types';
import {
  loginSchema,
  refreshSchema,
  registerSchema,
  type LoginInput,
  type RefreshInput,
  type RegisterInput,
} from '@ks/validation';
import type { Request } from 'express';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { UsersService } from '../users/users.service';
import { AuthService, type RequestMeta } from './auth.service';
import {
  AuthResponseDto,
  LoginDto,
  RefreshDto,
  RegisterDto,
  UserResponseDto,
} from './dto/auth.dto';
import { CurrentUser, JwtAuthGuard } from './jwt-auth.guard';
import type { AccessTokenPayload } from './auth.service';

const meta = (req: Request): RequestMeta => ({ ip: req.ip, userAgent: req.headers['user-agent'] });

@ApiTags('auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly users: UsersService,
  ) {}

  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiBody({ type: RegisterDto })
  @ApiOkResponse({ type: AuthResponseDto })
  register(
    @Body(new ZodValidationPipe(registerSchema)) body: RegisterInput,
    @Req() req: Request,
  ): Promise<AuthResponse> {
    return this.auth.register(body, meta(req));
  }

  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({ type: AuthResponseDto })
  login(
    @Body(new ZodValidationPipe(loginSchema)) body: LoginInput,
    @Req() req: Request,
  ): Promise<AuthResponse> {
    return this.auth.login(body, meta(req));
  }

  @Post('refresh')
  @HttpCode(200)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiBody({ type: RefreshDto })
  @ApiOkResponse({ type: AuthResponseDto })
  refresh(
    @Body(new ZodValidationPipe(refreshSchema)) body: RefreshInput,
    @Req() req: Request,
  ): Promise<AuthResponse> {
    return this.auth.refresh(body.refreshToken, meta(req));
  }

  @Post('logout')
  @HttpCode(204)
  @ApiBody({ type: RefreshDto })
  async logout(@Body(new ZodValidationPipe(refreshSchema)) body: RefreshInput): Promise<void> {
    await this.auth.logout(body.refreshToken);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({ type: UserResponseDto })
  me(@CurrentUser() user: AccessTokenPayload): Promise<UserDto> {
    return this.users.getProfile(user.sub);
  }
}

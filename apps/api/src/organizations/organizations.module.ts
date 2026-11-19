import {
  CanActivate,
  Controller,
  ExecutionContext,
  ForbiddenException,
  Get,
  Injectable,
  Module,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { OrganizationDto } from '@ks/shared-types';
import { OrganizationResponseDto } from '../auth/dto/auth.dto';
import { AuthService, type AccessTokenPayload } from '../auth/auth.service';
import { CurrentUser, JwtAuthGuard, type AuthenticatedRequest } from '../auth/jwt-auth.guard';
import { PrismaService } from '../database/prisma.service';

/**
 * Aislamiento multi-organización: cualquier ruta con :orgId exige membresía.
 * Devuelve 404 (no 403) para no revelar la existencia de organizaciones ajenas.
 */
@Injectable()
export class OrgMemberGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<AuthenticatedRequest & { membershipRole?: string }>();
    const orgId = String(req.params.orgId ?? '');
    if (!orgId || !req.user) throw new ForbiddenException();
    const membership = await this.prisma.membership.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId: req.user.sub } },
      include: { role: true },
    });
    if (!membership) throw new ForbiddenException('Sin acceso a esta organización');
    req.membershipRole = membership.role.key;
    return true;
  }
}

@ApiTags('organizations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'organizations', version: '1' })
export class OrganizationsController {
  constructor(private readonly auth: AuthService) {}

  @Get()
  @ApiOkResponse({ type: [OrganizationResponseDto] })
  list(@CurrentUser() user: AccessTokenPayload): Promise<OrganizationDto[]> {
    return this.auth.organizationsFor(user.sub);
  }

  @Get(':orgId')
  @UseGuards(OrgMemberGuard)
  @ApiOkResponse({ type: OrganizationResponseDto })
  async get(
    @Param('orgId', new ParseUUIDPipe()) orgId: string,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<OrganizationDto> {
    const orgs = await this.auth.organizationsFor(user.sub);
    return orgs.find((o) => o.id === orgId)!;
  }
}

@Module({
  controllers: [OrganizationsController],
  providers: [OrgMemberGuard],
  exports: [OrgMemberGuard],
})
export class OrganizationsModule {}

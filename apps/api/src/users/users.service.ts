import { Injectable, NotFoundException } from '@nestjs/common';
import type { UserDto } from '@ks/shared-types';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string): Promise<UserDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, displayName: true },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }
}

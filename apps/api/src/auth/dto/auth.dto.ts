import { ApiProperty } from '@nestjs/swagger';

/** DTOs para Swagger. La validación real la hacen los esquemas zod de @ks/validation. */
export class RegisterDto {
  @ApiProperty({ example: 'admin@bar.com' }) email: string;
  @ApiProperty({ example: 'ClaveSegura123', minLength: 10 }) password: string;
  @ApiProperty({ example: 'Ana' }) displayName: string;
  @ApiProperty({ example: 'Bar La Canción' }) organizationName: string;
}

export class LoginDto {
  @ApiProperty({ example: 'admin@bar.com' }) email: string;
  @ApiProperty() password: string;
}

export class RefreshDto {
  @ApiProperty() refreshToken: string;
}

class UserResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() email: string;
  @ApiProperty() displayName: string;
}

class OrganizationResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() slug: string;
  @ApiProperty({ enum: ['owner', 'admin', 'host', 'participant'] }) role: string;
}

export class AuthResponseDto {
  @ApiProperty() accessToken: string;
  @ApiProperty() refreshToken: string;
  @ApiProperty({ description: 'Segundos de vida del access token' }) expiresIn: number;
  @ApiProperty({ type: UserResponseDto }) user: UserResponseDto;
  @ApiProperty({ type: [OrganizationResponseDto] }) organizations: OrganizationResponseDto[];
}

export { UserResponseDto, OrganizationResponseDto };

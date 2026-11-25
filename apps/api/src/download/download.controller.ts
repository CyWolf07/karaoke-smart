import { Controller, Get, Module, NotFoundException, Redirect } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Env } from '../config/env';

/** Enlace estable para descargar la app Android: redirige al último APK publicado. */
@ApiTags('app')
@Controller({ path: 'app', version: '1' })
export class DownloadController {
  constructor(private readonly config: ConfigService<Env, true>) {}

  @Get('android')
  @Redirect()
  @ApiOperation({ summary: 'Descargar el APK (redirige a ANDROID_APK_URL)' })
  android(): { url: string; statusCode: number } {
    const url = this.config.get('ANDROID_APK_URL', { infer: true });
    if (!url) throw new NotFoundException('La app Android aún no está publicada');
    return { url, statusCode: 302 };
  }
}

@Module({ controllers: [DownloadController] })
export class DownloadModule {}

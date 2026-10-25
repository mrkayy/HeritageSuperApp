import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { Public } from '../../modules/identity/auth.guard.js';
import { PrismaService } from '../database/prisma.module.js';

@Controller()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get(['', 'api'])
  root() {
    return { name: 'Heritage API', status: 'alive' };
  }

  @Public()
  @Get(['health/live', 'api/health/live'])
  live() {
    return { status: 'alive' };
  }

  @Public()
  @Get(['health/ready', 'api/health/ready'])
  async ready() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ready' };
    } catch {
      throw new ServiceUnavailableException({ code: 'NOT_READY', message: 'Database unavailable', field_errors: {} });
    }
  }
}

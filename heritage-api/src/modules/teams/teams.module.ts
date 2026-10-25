import { Controller, Get, Module } from '@nestjs/common';
import { PrismaService } from '../../platform/database/prisma.module.js';
import { RequireCapability } from '../identity/auth.guard.js';

@Controller('teams')
export class TeamsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @RequireCapability('teams.read')
  list() {
    return this.prisma.team.findMany({ orderBy: { name: 'asc' }, select: { id: true, key: true, name: true } });
  }
}

@Module({ controllers: [TeamsController] })
export class TeamsModule {}

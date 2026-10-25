import { Global, Injectable, Logger, Module } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../database/prisma.module.js';

type Db = Pick<PrismaService, 'auditEvent'> | Prisma.TransactionClient;

export interface AuditEntry {
  action: string;
  actorId?: string | null;
  subjectId?: string | null;
  metadata?: Prisma.InputJsonValue;
  ip?: string | null;
}

/** Append-only audit trail. Never store tokens, passwords or note bodies here. */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);
  constructor(private readonly prisma: PrismaService) {}

  async record(entry: AuditEntry, db: Db = this.prisma): Promise<void> {
    try {
      await db.auditEvent.create({ data: entry });
    } catch (err) {
      this.logger.error(`audit write failed for ${entry.action}`, err as Error);
    }
  }
}

@Global()
@Module({ providers: [AuditService], exports: [AuditService] })
export class AuditModule {}

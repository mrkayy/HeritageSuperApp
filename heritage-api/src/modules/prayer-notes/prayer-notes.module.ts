import { Module } from '@nestjs/common';
import { AuditModule } from '../../platform/audit/audit.module.js';
import { AppConfigModule } from '../../platform/config/config.module.js';
import { PrismaModule } from '../../platform/database/prisma.module.js';
import { EmailModule } from '../../platform/email/email.module.js';
import { PrayerNotesController } from './prayer-notes.controller.js';
import { PrayerNotesService } from './prayer-notes.service.js';

@Module({
  imports: [PrismaModule, AuditModule, EmailModule, AppConfigModule],
  controllers: [PrayerNotesController],
  providers: [PrayerNotesService],
  exports: [PrayerNotesService],
})
export class PrayerNotesModule {}

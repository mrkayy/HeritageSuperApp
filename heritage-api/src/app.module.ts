import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AcademyModule } from './modules/academy/academy.module.js';
import { AttendanceModule } from './modules/attendance/attendance.module.js';
import { CelebrationsModule } from './modules/celebrations/celebrations.module.js';
import { FollowUpModule } from './modules/followup/followup.module.js';
import { IdentityModule } from './modules/identity/identity.module.js';
import { PeopleModule } from './modules/people/people.module.js';
import { PrayerNotesModule } from './modules/prayer-notes/prayer-notes.module.js';
import { StewardsModule } from './modules/stewards/stewards.module.js';
import { TeamsModule } from './modules/teams/teams.module.js';
import { VolunteersModule } from './modules/volunteers/volunteers.module.js';
import { AuditModule } from './platform/audit/audit.module.js';
import { AppConfigModule } from './platform/config/config.module.js';
import { PrismaModule } from './platform/database/prisma.module.js';
import { EmailModule } from './platform/email/email.module.js';
import { ApiExceptionFilter } from './platform/http/errors.js';
import { HealthController } from './platform/http/health.controller.js';
import { OriginCheckMiddleware, RequestIdMiddleware } from './platform/http/middleware.js';

/**
 * Composition root of the modular monolith.
 *   platform/  — cross-cutting infrastructure (config, db, email, audit, http)
 *   modules/   — business domains; each owns its tables and exposes services
 */
@Module({
  imports: [
    AppConfigModule,
    PrismaModule,
    EmailModule,
    AuditModule,
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 120 }]),
    IdentityModule,
    TeamsModule,
    StewardsModule,
    PeopleModule,
    FollowUpModule,
    AttendanceModule,
    PrayerNotesModule,
    CelebrationsModule,
    AcademyModule,
    VolunteersModule,
  ],
  controllers: [HealthController],
  providers: [
    // Throttle first, then authenticate (IdentityModule registers AuthGuard).
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: ApiExceptionFilter },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware, OriginCheckMiddleware).forRoutes('*');
  }
}

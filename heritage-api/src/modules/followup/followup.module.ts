import { Module } from '@nestjs/common';
import { FollowUpController } from './followup.controller.js';
import { FollowUpService } from './followup.service.js';

@Module({
  controllers: [FollowUpController],
  providers: [FollowUpService],
  exports: [FollowUpService],
})
export class FollowUpModule {}

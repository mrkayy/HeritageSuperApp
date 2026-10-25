import { Module } from '@nestjs/common';
import { CelebrationsController } from './celebrations.controller.js';
import { CelebrationsService } from './celebrations.service.js';

@Module({
  controllers: [CelebrationsController],
  providers: [CelebrationsService],
  exports: [CelebrationsService],
})
export class CelebrationsModule {}

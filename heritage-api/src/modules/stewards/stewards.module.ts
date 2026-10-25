import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module.js';
import { StewardsController } from './stewards.controller.js';
import { StewardsService } from './stewards.service.js';

@Module({
  imports: [IdentityModule],
  controllers: [StewardsController],
  providers: [StewardsService],
})
export class StewardsModule {}

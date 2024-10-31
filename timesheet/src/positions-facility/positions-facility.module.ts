import { Module } from '@nestjs/common';
import { PositionsFacilityService } from './positions-facility.service';

@Module({
  providers: [PositionsFacilityService],
})
export class PositionsFacilityModule {}

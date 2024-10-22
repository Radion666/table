import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateMasterFacilityDto } from './create-master-with-facility';

export class UpdateMasterFacilityDto extends PartialType(
  OmitType(CreateMasterFacilityDto, ['facility_id']),
) {}

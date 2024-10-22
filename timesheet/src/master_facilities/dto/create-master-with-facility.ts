import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNumber } from 'class-validator';

export class CreateMasterFacilityDto {
  @ApiProperty({
    example: [0, 1, 2],
    description: 'Идентификатор мастера',
  })
  @IsArray()
  readonly mastersIds: number[];

  @ApiProperty({
    example: 0,
    description: 'Идентификатор объекта',
  })
  @IsNumber()
  readonly facility_id: number;
}

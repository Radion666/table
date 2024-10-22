import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreatePositionDto {
  @ApiProperty({
    example: 'Мастер',
    description: 'Наименование должности',
  })
  @IsNotEmpty()
  @IsString()
  readonly name: string;
}

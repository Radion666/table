import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateFacilityDto {
  @ApiProperty({
    example: 'Объект 1',
    description: 'Наименование объекта',
  })
  @IsNotEmpty()
  @IsString()
  readonly name: string;

  @ApiProperty({
    example: 'город А, улица В',
    description: 'Наименование адреса объект',
  })
  @IsString()
  @IsOptional()
  readonly address: string;

  @ApiProperty({
    example: 'Объект такой то такой то',
    description: 'Характеристика объекта',
  })
  @IsString()
  @IsOptional()
  readonly description: string;
}

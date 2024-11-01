import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

export interface facilityTimeSheetSettingType {
  letters: true;
  integers: worksheetTableFacilitySettingIntegersType;
}

export type worksheetTableFacilitySettingIntegersType = {
  allowDay: boolean;
  allowNight: boolean;
  allowOverwork: boolean;
  allowOnlyTotal: boolean;
};

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

  @ApiProperty({
    example: '[1,2,3,4,5]',
    description: 'Массив мастеров',
  })
  @IsOptional()
  @IsArray()
  mastersIds?: number[];

  @IsObject()
  settings: facilityTimeSheetSettingType;
}

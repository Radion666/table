import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({
    example: 'master',
    description: 'Наименование роли - EN',
  })
  @IsNotEmpty()
  @IsString()
  readonly name: string;
  @ApiProperty({
    example: 'master',
    description: 'Наименование роли - RU',
  })
  @IsNotEmpty()
  @IsString()
  readonly alt_name: string;
}

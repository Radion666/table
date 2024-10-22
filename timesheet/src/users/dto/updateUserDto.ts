import { ApiProperty, OmitType, PartialType } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import { CreateUserDto } from './userDto';

export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['password']),
) {
  @ApiProperty({
    example: 'password',
    description: 'Пароль пользователя',
  })
  @IsOptional()
  readonly password: string;
}

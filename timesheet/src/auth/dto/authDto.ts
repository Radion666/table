import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  //login
  @ApiProperty({
    example: 'login of login',
    description: 'Учетка пользователя',
  })
  @IsNotEmpty()
  @IsString({
    message: 'Должно быть строкой',
  })
  readonly login: string;
  //pasword
  @ApiProperty({
    example: 'password',
    description: 'Пароль пользователя',
  })
  @IsNotEmpty()
  readonly password: string;
}

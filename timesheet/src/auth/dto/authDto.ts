import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length } from 'class-validator';

export class LoginDto {
  //login
  @ApiProperty({
    example: 'login of login',
    description: 'Учетка пользователя',
  })
  @IsNotEmpty()
  @Length(6, 20, {
    message: 'Длина логина должна быть не менее 6 символов',
  })
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
  @Length(7, 20, {
    message: 'Длина пароля должна быть не менее 7 символов',
  })
  readonly password: string;
}

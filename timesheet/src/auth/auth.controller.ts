import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserDecorator } from 'src/common/UserDecorator/UserDecorator';
import { CreateUserDto } from 'src/users/dto/userDto';
import { User } from 'src/users/user.model';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/authDto';
import { JwtAuthGuard } from './jwt-auth.guard';

@ApiTags('Авторизационные')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('/create')
  create(@Body() userDto: CreateUserDto) {
    return this.authService.create(userDto);
  }

  @Get('/user')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  getUser(@UserDecorator() user: User) {
    return this.authService.getUserByToken(user.login);
  }

  @Post()
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }
}

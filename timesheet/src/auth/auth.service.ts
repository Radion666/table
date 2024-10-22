import {
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcrypt';
import { CreateUserDto } from 'src/users/dto/userDto';
import { User } from 'src/users/user.model';
import { UsersService } from 'src/users/users.service';
import { LoginDto } from './dto/authDto';

@Injectable()
export class AuthService {
  constructor(
    private userService: UsersService,
    private jwtService: JwtService,
  ) {}

  async create(userDto: CreateUserDto) {
    const user = await this.userService.getUser(userDto.login);
    if (user) {
      throw new HttpException(
        'Пользователь существует',
        HttpStatus.BAD_REQUEST,
      );
    }
    const hashPassword = await hash(userDto.password, 5);
    await this.userService.createUser({
      ...userDto,
      password: hashPassword,
    });
    return 'success';
  }

  private async generateToken(user: User) {
    const payload = {
      login: user.login,
      id: user.id,
      role: user.role_id,
    };
    return {
      token: this.jwtService.sign(payload),
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateToken(loginDto);
    return this.generateToken(user);
  }

  private async validateToken(loginDto: LoginDto) {
    const user = await this.userService.getUser(loginDto.login);

    if (!user) {
      throw new UnauthorizedException('Неправильный логин или пароль');
    }

    const passwordEquals = await compare(loginDto?.password, user?.password);

    if (user && passwordEquals) {
      return user;
    }
    throw new UnauthorizedException({
      message: 'Неправильный логин или пароль',
    });
  }

  async getUserByToken(login: string) {
    const userData = await this.userService.getUser(login);

    if (userData) {
      return {
        login: userData.login,
        lastName: userData.lastName,
        firstName: userData.firstName,
        middleName: userData.middleName,
        position: userData?.position,
        role: userData?.role,
        id: userData.id,
      };
    }
    throw new UnauthorizedException({
      message: 'Пользователь не был найден',
    });
  }
}

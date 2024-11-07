import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private readonly userService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();

    try {
      const authHeader = req.headers.authorization;
      const bearer = authHeader.split(' ')?.[0];
      const token = authHeader.split(' ')?.[1];

      if (bearer !== 'Bearer' || !token) {
        throw new UnauthorizedException({
          message: 'Пользователь не авторизован',
        });
      }

      const user = this.jwtService.verify(token);
      req.user = user;

      const userId = user.id;

      await this.validateUserPasswordByTime(userId, user.iat);

      return true;
    } catch (e) {
      console.error(e);
      throw new UnauthorizedException({
        message: e.message || 'Пользователь не авторизован',
      });
    }
  }

  private async validateUserPasswordByTime(userId: number, iat: number) {
    const foundUser = await this.userService.getUserByPk(userId);

    if (
      foundUser.passwordChangedAt &&
      iat * 1000 < new Date(foundUser.passwordChangedAt).getTime()
    ) {
      throw new UnauthorizedException(
        'Пароль был изменён. Пожалуйста, войдите снова.',
      );
    }
  }
}

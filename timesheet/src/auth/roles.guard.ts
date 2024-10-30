import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { RolesService } from 'src/roles/roles.service';
import { User } from 'src/users/user.model';
import { UsersService } from 'src/users/users.service';
import { ROLES_KEY } from './roles-auth.decorator';

@Injectable()
export class RolesGuards implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private reflector: Reflector,
    private readonly rolesService: RolesService,
    private readonly userService: UsersService,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const requiredRoles = this.reflector.getAllAndOverride<string[]>(
        ROLES_KEY,
        [context.getHandler(), context.getClass()],
      );
      if (!requiredRoles) return true;

      const req = context.switchToHttp().getRequest();

      const authHeader = req.headers.authorization;
      const bearer = authHeader.split(' ')?.[0];
      const token = authHeader.split(' ')?.[1];

      if (bearer !== 'Bearer' || !token) {
        throw new UnauthorizedException({
          message: 'Пользователь не авторизован',
        });
      }

      const user = this.jwtService.verify(token) as User;
      req.user = user;
      const userId = user.id;
      const currentUserRole = await this.userService.getUserRoleByPk(userId);

      if (!currentUserRole) {
        throw new UnauthorizedException('Пользователь не авторизован');
      }
      const actualRole = await this.rolesService.findById(currentUserRole);

      return requiredRoles.includes(actualRole);
    } catch (e) {
      console.log(e);
      throw new HttpException('Доступ запрещен', HttpStatus.FORBIDDEN);
    }
  }
}

import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { Roles } from 'src/auth/roles-auth.decorator';
import { RolesGuards } from 'src/auth/roles.guard';
import { UpdateUserDto } from './dto/updateUserDto';
import { UsersService } from './users.service';

@ApiTags('Пользователи')
@Roles('admin')
@UseGuards(RolesGuards)
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({
    summary: 'Получение пользователей',
  })
  @Get()
  getAll() {
    return this.usersService.getAllUser();
  }

  @ApiOperation({
    summary: 'Получение сотрудников',
  })
  @Get('/employees')
  @ApiQuery({
    name: 'type',
    type: String,
    description: 'Наименование роли EN',
    required: false,
  })
  getEmployees(@Query('type') type?: string) {
    return this.usersService.getEmployees(type);
  }

  @Patch(':id')
  update(@Param('id') id: number, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.updateUser(updateUserDto, id);
  }
}

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
@UseGuards(JwtAuthGuard)
@Roles('admin', 'personnel_officer')
@UseGuards(RolesGuards)
@ApiBearerAuth()
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
  @Roles('admin', 'personnel_officer')
  @Get('/employees')
  @ApiQuery({
    name: 'type',
    type: String,
    description: 'Наименование роли EN',
    required: false,
  })
  @ApiQuery({
    name: 'facilityId',
    type: Number,
    description: 'ID объекта',
    required: false,
  })
  @Roles('admin', 'personnel_officer')
  getEmployees(
    @Query('type') type?: string,
    @Query('facilityId') facilityId?: number,
  ) {
    return this.usersService.getEmployees(type, facilityId);
  }

  @Patch(':id')
  update(@Param('id') id: number, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.updateUser(updateUserDto, id);
  }
}

import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { Roles } from 'src/auth/roles-auth.decorator';
import { RolesGuards } from 'src/auth/roles.guard';
import { ChangeLogsService } from './change-logs.service';
import { UpdateChangeLogDto } from './dto/update-change_log.dto';

@ApiTags('Логи табеля')
@UseGuards(JwtAuthGuard)
@Roles('admin')
@UseGuards(RolesGuards)
@Controller('worklogschanges')
@ApiBearerAuth()
export class ChangeLogsController {
  constructor(private readonly changeLogsService: ChangeLogsService) {}

  @Get()
  findAll(@Query('page') page: number, @Query('pageSize') pageSize: number) {
    return this.changeLogsService.findAll(page, pageSize);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.changeLogsService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateChangeLogDto: UpdateChangeLogDto,
  ) {
    return this.changeLogsService.update(+id, updateChangeLogDto);
  }
}

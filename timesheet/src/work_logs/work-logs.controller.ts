import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Query,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { Roles } from 'src/auth/roles-auth.decorator';
import { RolesGuards } from 'src/auth/roles.guard';
import { UserDecorator } from 'src/common/UserDecorator/UserDecorator';
import { User } from 'src/users/user.model';
import { createOrUpdateWorkLogsDto } from './dto/create-work_log.dto';
import { UpdateWorkLogDto } from './dto/update-work_log.dto';
import { WorkLog } from './work-logs.model';
import { WorkLogsService } from './work-logs.service';

@ApiTags('Таблица учета времени')
@UseGuards(JwtAuthGuard)
@Roles('admin', 'master')
@UseGuards(RolesGuards)
@ApiBearerAuth()
@Controller('work-logs')
export class WorkLogsController {
  constructor(private readonly workLogsService: WorkLogsService) {}

  @Post()
  @ApiBody({ type: [createOrUpdateWorkLogsDto] })
  createOrUpdateWorkLogs(
    @UserDecorator() user: User,
    @Body() createOrUpdateWorkLogsDto: createOrUpdateWorkLogsDto[],
  ) {
    return this.workLogsService.createOrUpdateWorkLogs(
      user,
      createOrUpdateWorkLogsDto,
    );
  }

  @Roles('master', 'admin')
  @UseGuards(RolesGuards)
  @Get(':date/:id')
  async getWorkLogsByDate(
    @Param('date') date: string,
    @Param('id') id: string,
  ): Promise<WorkLog[]> {
    const workLogs = await this.workLogsService.findByDate(date, +id);
    if (!workLogs || workLogs.length === 0) {
      return [];
    }
    return workLogs;
  }

  @Get()
  findAll() {
    return this.workLogsService.findAll();
  }

  @Get('download')
  @Header('Content-Disposition', 'attachment; filename="SheetJSNest.xlsx"')
  async downloadXlsxFile(
    @Query('date') date: string,
    @Query('id') id: string,
  ): Promise<StreamableFile> {
    return this.workLogsService.download(date, +id);
  }

  // @Get(':id')
  // findOne(@Param('id') id: string) {
  //   return this.workLogsService.findOne(+id);
  // }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateWorkLogDto: UpdateWorkLogDto) {}

  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.workLogsService.remove(+id);
  // }
}

import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Patch,
  Post,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { Workbook } from 'exceljs';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { Roles } from 'src/auth/roles-auth.decorator';
import { RolesGuards } from 'src/auth/roles.guard';
import { UserDecorator } from 'src/common/UserDecorator/UserDecorator';
import { getDaysInMonth } from 'src/common/utils/date-utils';
import { incrementColumn } from 'src/common/utils/excel-utils';
import { User } from 'src/users/user.model';
import { PassThrough } from 'stream';
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
  async downloadXlsxFile(): Promise<StreamableFile> {
    const dates = getDaysInMonth(0);

    const workbook = new Workbook();
    const worksheet = workbook.addWorksheet('Пример');

    worksheet.mergeCells('A1:A4');
    worksheet.mergeCells('B1:B4');
    worksheet.mergeCells('C1:C4');

    worksheet.columns = [
      { header: 'Работник', key: 'id', width: 25 },
      { header: 'Местный (0) / неместный (1)', key: 'name', width: 40 },
      { header: '', key: '', width: 10 },
    ];

    let startColumn = 'D';

    for (let i = 0; i < dates?.length; i++) {
      const day = dates[i];
      worksheet.getCell(`${startColumn}1:${startColumn}2`).value = day.date;
      worksheet.getCell(`${startColumn}3:${startColumn}4`).value = day.dayName;

      worksheet.mergeCells(`${startColumn}1:${startColumn}2`);
      worksheet.mergeCells(`${startColumn}3:${startColumn}4`);

      const upperCell = worksheet.getCell(`${startColumn}1:${startColumn}2`);
      const bottomCell = worksheet.getCell(`${startColumn}3:${startColumn}4`);

      upperCell.alignment = {
        vertical: 'middle',
        horizontal: 'center',
      };

      bottomCell.alignment = {
        vertical: 'middle',
        horizontal: 'center',
      };

      startColumn = incrementColumn(startColumn);
    }

    const nextColumn = incrementColumn(startColumn);
    const totalSmens = incrementColumn(nextColumn);
    const totalHours = incrementColumn(totalSmens);
    const totalSmensWeekends = incrementColumn(totalHours);

    const applyAlignment = (cellRef: string, value: string) => {
      const cell = worksheet.getCell(cellRef);
      cell.value = value;
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    };

    const totalHoursRow = `${startColumn}1:${nextColumn}1`;
    const totalDayHoursRow = `${startColumn}2:${nextColumn}2`;
    const totalNigthHoursRow = `${startColumn}3:${nextColumn}3`;
    const totalFirstTwoHoursRow = `${startColumn}4`;
    const totalSecondTwoHoursRow = `${nextColumn}4`;
    const totalSmensRow = `${totalSmens}1:${totalSmens}4`;
    const totalHoursSecondRow = `${totalHours}1:${totalHours}4`;
    const totalSmensWeekendsRow = `${totalSmensWeekends}1:${totalSmensWeekends}4`;

    worksheet.mergeCells(totalHoursRow);
    worksheet.mergeCells(totalDayHoursRow);
    worksheet.mergeCells(totalNigthHoursRow);
    worksheet.mergeCells(totalSmensRow);
    worksheet.mergeCells(totalHoursSecondRow);
    worksheet.mergeCells(totalSmensWeekendsRow);

    applyAlignment(totalHoursRow, 'Итого часов');
    applyAlignment(totalDayHoursRow, 'Дневные');
    applyAlignment(totalNigthHoursRow, 'Ночные');
    applyAlignment(totalFirstTwoHoursRow, 'Перв. 2 ч');
    applyAlignment(totalSecondTwoHoursRow, 'Более 2 ч');
    applyAlignment(totalSmensRow, 'Итого смен');
    applyAlignment(totalHoursSecondRow, 'Итого часов (вых)');
    applyAlignment(totalSmensWeekendsRow, 'Итого смен (вых)');

    const a1a2Cell = worksheet.getCell('A1:A2');
    const b1b2Cell = worksheet.getCell('B1:B2');
    const ce1c2Cell = worksheet.getCell('C1:C2');

    a1a2Cell.alignment = {
      vertical: 'middle',
      horizontal: 'center',
    };
    b1b2Cell.alignment = {
      vertical: 'middle',
      horizontal: 'center',
    };

    // worksheet.addRow({ id: 1, name: 'Иван', age: 25 });
    // worksheet.addRow({ id: 2, name: 'Мария', age: 30 });

    // Создаем поток для передачи данных
    const stream = new PassThrough();
    await workbook.xlsx.write(stream);
    stream.end();

    return new StreamableFile(stream);
  }

  // @Get(':id')
  // findOne(@Param('id') id: string) {
  //   return this.workLogsService.findOne(+id);
  // }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateWorkLogDto: UpdateWorkLogDto) {
    return this.workLogsService.update(+id, updateWorkLogDto);
  }

  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.workLogsService.remove(+id);
  // }
}

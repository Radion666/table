import { PartialType } from '@nestjs/swagger';
import { createOrUpdateWorkLogsDto } from './create-work_log.dto';

export class UpdateWorkLogDto extends PartialType(createOrUpdateWorkLogsDto) {}

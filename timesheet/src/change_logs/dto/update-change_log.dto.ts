import { PartialType } from '@nestjs/swagger';
import { CreateChangeLogDto } from './create-change_log.dto';

export class UpdateChangeLogDto extends PartialType(CreateChangeLogDto) {}

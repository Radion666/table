import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt, IsNotEmpty, ValidateNested } from 'class-validator';
import { WorkDaysType } from 'src/work_logs/dto/types';
export class CreateChangeLogDto {
  @ApiProperty({
    example: 1,
    description: 'ID записи в табеле',
  })
  @IsInt()
  @IsNotEmpty()
  workLogId: number;

  @IsArray()
  @ValidateNested({ each: true })
  oldValue: WorkDaysType[];

  @IsArray()
  @ValidateNested({ each: true })
  newValue: WorkDaysType[];

  @IsNotEmpty()
  changes: any;

  @IsInt()
  @IsNotEmpty()
  userId: number;
}

import { IsInt, Max, Min } from 'class-validator';

export class UpdateSettingsDto {
  @IsInt()
  @Min(1)
  @Max(1440)
  alertThresholdMinutes!: number;
}

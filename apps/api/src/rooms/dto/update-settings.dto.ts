import {
  IsOptional,
  IsString,
  IsBoolean,
  IsNumber,
  Min,
  Max,
  ValidateNested,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';

class PermissionsDto {
  @IsOptional()
  @IsBoolean()
  allowChat?: boolean;

  @IsOptional()
  @IsBoolean()
  allowScreenShare?: boolean;

  @IsOptional()
  @IsBoolean()
  allowMicrophone?: boolean;

  @IsOptional()
  @IsBoolean()
  allowCamera?: boolean;
}

export class UpdateSettingsDto {
  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsBoolean()
  requirePassword?: boolean;

  @IsOptional()
  @IsBoolean()
  lockRoom?: boolean;

  @IsOptional()
  @IsString()
  roomName?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => PermissionsDto)
  @IsObject()
  permissions?: PermissionsDto;

  @IsOptional()
  @IsNumber()
  @Min(2)
  @Max(50)
  maxParticipants?: number;
}

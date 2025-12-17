import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsDateString,
  ValidateNested,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PermissionsDto {
  @IsBoolean()
  @IsOptional()
  allowJoinBeforeHost?: boolean;

  @IsBoolean()
  @IsOptional()
  allowCamera?: boolean;

  @IsBoolean()
  @IsOptional()
  allowMicrophone?: boolean;
}

export class CreateRoomDto {
  @IsString()
  name?: string;

  @IsString()
  @IsNotEmpty()
  hostId!: string; // Persistent User ID (UUID)

  @IsOptional()
  @IsDateString()
  scheduledTime?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => PermissionsDto)
  @IsObject()
  permissions?: PermissionsDto;
}

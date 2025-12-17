import { IsString, IsNotEmpty } from 'class-validator';

export class ValidatePasswordDto {
  @IsString()
  @IsNotEmpty()
  password!: string;
}

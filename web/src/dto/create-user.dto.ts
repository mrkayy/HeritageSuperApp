import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsOptional,
  IsEnum,
  IsUUID,
} from 'class-validator';
import {  user_role  } from './enums';

export class CreateUserDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  first_name!: string;

  @IsString()
  @IsNotEmpty()
  last_name!: string;

  @IsString()
  @IsOptional()
  password?: string;

  @IsString()
  @IsOptional()
  username?: string;

  @IsString()
  @IsOptional()
  phone_number?: string;

  @IsEnum(user_role)
  @IsOptional()
  role?: user_role;

  @IsUUID()
  @IsOptional()
  church_id?: string;

  @IsUUID()
  @IsOptional()
  sector_id?: string;

  @IsUUID()
  @IsOptional()
  team_id?: string;
}

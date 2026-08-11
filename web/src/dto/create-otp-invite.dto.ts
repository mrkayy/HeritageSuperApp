import { IsEmail, IsString, IsNotEmpty, IsIn } from 'class-validator';
import {  user_role  } from './enums';

export class CreateOtpInviteDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  first_name!: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(Object.values(user_role))
  role!: user_role;

  @IsString()
  @IsNotEmpty()
  sector_id!: string;

  @IsString()
  @IsNotEmpty()
  church_id!: string;
}

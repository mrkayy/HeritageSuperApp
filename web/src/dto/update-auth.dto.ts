import { IsEmail, IsString } from 'class-validator';

export class UpdateAuthDto {
  @IsString()
  @IsEmail()
  email!: string;
}

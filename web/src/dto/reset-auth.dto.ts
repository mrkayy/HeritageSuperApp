import { IsEmail, IsString, IsNotEmpty, MinLength } from 'class-validator';

export class ResetAuthDto {
  @IsString()
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  otp!: string;

  @IsString()
  @IsNotEmpty()
  new_password!: string;
}

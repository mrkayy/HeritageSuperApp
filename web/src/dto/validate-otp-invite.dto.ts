import { IsEmail, IsString, IsNotEmpty, Matches } from 'class-validator';

export class ValidateOtpInviteDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z0-9]{3}-[A-Z0-9]{3}-[A-Z0-9]{3}$/, {
    message: 'OTP must be in format XXX-XXX-XXX',
  })
  otp!: string;
}

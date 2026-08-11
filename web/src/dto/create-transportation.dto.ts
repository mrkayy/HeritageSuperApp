import { IsEmail, IsString } from 'class-validator';

export class CreateTransportationDto {
  @IsString()
  @IsEmail()
  email!: string;
}

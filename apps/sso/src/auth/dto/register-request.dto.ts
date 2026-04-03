import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';

export class RegisterRequestDto {
  @ApiProperty({ example: 'user@tecopos.com' })
  @IsEmail()
  public email!: string;

  @ApiProperty({ example: 'P@ssword1234', minLength: 8, maxLength: 64 })
  @IsString()
  @MinLength(8)
  @MaxLength(64)
  public password!: string;
}

import { ApiProperty } from '@nestjs/swagger';

export class AuthResponseDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  public accessToken!: string;

  @ApiProperty({ example: 86_400 })
  public expiresIn!: number;
}

export class RegisterResponseDto {
  @ApiProperty({ format: 'uuid' })
  public id!: string;

  @ApiProperty({ example: 'user@tecopos.com' })
  public email!: string;

  @ApiProperty({ example: '2026-04-03T00:00:00.000Z' })
  public createdAt!: string;
}

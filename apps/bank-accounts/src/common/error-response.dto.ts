import { ApiProperty } from '@nestjs/swagger';

export class ErrorResponseDto {
  @ApiProperty({ example: 400 })
  public statusCode!: number;

  @ApiProperty({ example: 'BAD_REQUEST' })
  public code!: string;

  @ApiProperty({ example: 'Validation failed' })
  public message!: string;

  @ApiProperty({ example: '2026-04-03T12:00:00.000Z' })
  public timestamp!: string;

  @ApiProperty({ example: '/accounts' })
  public path!: string;
}

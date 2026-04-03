import { ApiProperty } from '@nestjs/swagger';

export class ErrorResponseDto {
  @ApiProperty({ example: 401 })
  public statusCode!: number;

  @ApiProperty({ example: 'UNAUTHORIZED' })
  public code!: string;

  @ApiProperty({ example: 'Missing or invalid bearer token' })
  public message!: string;

  @ApiProperty({ example: '2026-04-02T18:21:10.000Z' })
  public timestamp!: string;

  @ApiProperty({ example: '/accounts' })
  public path!: string;
}

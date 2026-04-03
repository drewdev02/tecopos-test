import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '../common/error-response.dto.js';
import { GatewayTrustGuard } from '../security/gateway-trust.guard.js';
import { getTrustedUserId } from '../security/user-context.js';
import { AccountsService } from './accounts.service.js';
import { TransactionsQueryDto } from './dto/transactions-query.dto.js';

type TrustedRequest = {
  trustedUser?: {
    userId: string;
  };
};

@ApiTags('bank-accounts')
@ApiBearerAuth('bearer')
@UseGuards(GatewayTrustGuard)
@Controller('accounts')
export class AccountsController {
  public constructor(private readonly accountsService: AccountsService) {}

  @Get()
  @ApiOperation({ summary: 'List user bank accounts from upstream provider' })
  @ApiOkResponse({ description: 'Accounts retrieved successfully' })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiServiceUnavailableResponse({ type: ErrorResponseDto })
  public async listAccounts(@Req() request: TrustedRequest): Promise<unknown> {
    const userId = getTrustedUserId(request);
    return this.accountsService.listAccounts(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single account details from upstream provider' })
  @ApiOkResponse({ description: 'Account retrieved successfully' })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiServiceUnavailableResponse({ type: ErrorResponseDto })
  public async getAccountById(
    @Req() request: TrustedRequest,
    @Param('id') accountId: string,
  ): Promise<unknown> {
    const userId = getTrustedUserId(request);
    return this.accountsService.getAccountById(userId, accountId);
  }

  @Get(':id/transactions')
  @ApiOperation({ summary: 'List paginated account transactions from upstream provider' })
  @ApiOkResponse({ description: 'Transactions retrieved successfully' })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiServiceUnavailableResponse({ type: ErrorResponseDto })
  public async listTransactions(
    @Req() request: TrustedRequest,
    @Param('id') accountId: string,
    @Query() query: TransactionsQueryDto,
  ): Promise<unknown> {
    const userId = getTrustedUserId(request);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    return this.accountsService.listTransactions(userId, accountId, page, limit);
  }
}

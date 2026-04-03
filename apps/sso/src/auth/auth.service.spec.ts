import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service.js';
import type { LoginRequestDto } from './dto/login-request.dto.js';
import type { RegisterRequestDto } from './dto/register-request.dto.js';
import { UserEntity } from '../users/user.entity.js';

jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

type UsersRepositoryMock = {
  findOne: jest.Mock;
  create: jest.Mock;
  save: jest.Mock;
  createQueryBuilder: jest.Mock;
};

type QueryBuilderMock = {
  addSelect: jest.Mock;
  where: jest.Mock;
  getOne: jest.Mock;
};

describe('AuthService', () => {
  let service: AuthService;
  let usersRepository: UsersRepositoryMock;
  let jwtService: { sign: jest.Mock };
  let queryBuilder: QueryBuilderMock;

  const hashMock = bcrypt.hash as jest.MockedFunction<typeof bcrypt.hash>;
  const compareMock = bcrypt.compare as jest.MockedFunction<typeof bcrypt.compare>;

  beforeEach(async () => {
    queryBuilder = {
      addSelect: jest.fn(),
      where: jest.fn(),
      getOne: jest.fn(),
    };
    queryBuilder.addSelect.mockReturnValue(queryBuilder);
    queryBuilder.where.mockReturnValue(queryBuilder);

    usersRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    };

    jwtService = {
      sign: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(UserEntity),
          useValue: usersRepository,
        },
        {
          provide: JwtService,
          useValue: jwtService,
        },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn().mockReturnValue(10),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);

    hashMock.mockResolvedValue('hashed-password');
    compareMock.mockResolvedValue(true);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('register success', async () => {
    // AI-assisted test case
    const dto: RegisterRequestDto = {
      email: 'USER@tecopos.com ',
      password: 'P@ssword1234',
    };

    const createdUser = {
      email: 'user@tecopos.com',
      password: 'hashed-password',
    };
    const savedUser = {
      id: '4f197ce4-1160-4f30-b15e-1f1a98d95f89',
      email: 'user@tecopos.com',
      password: 'hashed-password',
      createdAt: new Date('2026-04-03T00:00:00.000Z'),
    };

    usersRepository.findOne.mockResolvedValue(null);
    usersRepository.create.mockReturnValue(createdUser);
    usersRepository.save.mockResolvedValue(savedUser);

    const result = await service.register(dto);

    expect(usersRepository.findOne).toHaveBeenCalledWith({
      where: { email: 'user@tecopos.com' },
    });
    expect(bcrypt.hash).toHaveBeenCalledWith('P@ssword1234', 10);
    expect(usersRepository.create).toHaveBeenCalledWith({
      email: 'user@tecopos.com',
      password: 'hashed-password',
    });
    expect(result).toEqual({
      id: '4f197ce4-1160-4f30-b15e-1f1a98d95f89',
      email: 'user@tecopos.com',
      createdAt: '2026-04-03T00:00:00.000Z',
    });
  });

  it('register duplicate email -> conflict', async () => {
    // AI-assisted test case
    const dto: RegisterRequestDto = {
      email: 'user@tecopos.com',
      password: 'P@ssword1234',
    };

    usersRepository.findOne.mockResolvedValue({
      id: 'duplicate-user-id',
      email: 'user@tecopos.com',
    });

    try {
      await service.register(dto);
      throw new Error('Expected register to throw ConflictException');
    } catch (error) {
      expect(error).toBeInstanceOf(ConflictException);
      expect(error).toMatchObject({
        response: {
          code: 'EMAIL_ALREADY_EXISTS',
          message: 'Email already registered',
        },
      });
    }
  });

  it('login success -> token returned', async () => {
    // AI-assisted test case
    const dto: LoginRequestDto = {
      email: 'USER@tecopos.com ',
      password: 'P@ssword1234',
    };

    queryBuilder.getOne.mockResolvedValue({
      id: 'f5952f1a-0b90-4c3f-8fd8-eaf2c7cf8e92',
      email: 'user@tecopos.com',
      password: 'stored-hash',
    });
    jwtService.sign.mockReturnValue('jwt-token');

    const result = await service.login(dto);

    expect(usersRepository.createQueryBuilder).toHaveBeenCalledWith('user');
    expect(queryBuilder.addSelect).toHaveBeenCalledWith('user.password');
    expect(queryBuilder.where).toHaveBeenCalledWith('user.email = :email', {
      email: 'user@tecopos.com',
    });
    expect(bcrypt.compare).toHaveBeenCalledWith('P@ssword1234', 'stored-hash');
    expect(jwtService.sign).toHaveBeenCalledWith(
      {
        userId: 'f5952f1a-0b90-4c3f-8fd8-eaf2c7cf8e92',
        email: 'user@tecopos.com',
      },
      {
        algorithm: 'HS256',
        expiresIn: '24h',
      },
    );
    expect(result).toEqual({
      accessToken: 'jwt-token',
      expiresIn: 86_400,
    });
  });

  it('login invalid credentials -> unauthorized', async () => {
    // AI-assisted test case
    const dto: LoginRequestDto = {
      email: 'user@tecopos.com',
      password: 'wrong-password',
    };

    queryBuilder.getOne.mockResolvedValue({
      id: 'f5952f1a-0b90-4c3f-8fd8-eaf2c7cf8e92',
      email: 'user@tecopos.com',
      password: 'stored-hash',
    });
    compareMock.mockResolvedValue(false);

    try {
      await service.login(dto);
      throw new Error('Expected login to throw UnauthorizedException');
    } catch (error) {
      expect(error).toBeInstanceOf(UnauthorizedException);
      expect(error).toMatchObject({
        response: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
        },
      });
    }
  });
});

import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { UserEntity } from '../users/user.entity.js';
import type { AuthResponseDto, RegisterResponseDto } from './dto/auth-response.dto.js';
import type { LoginRequestDto } from './dto/login-request.dto.js';
import type { RegisterRequestDto } from './dto/register-request.dto.js';

type AuthPayload = {
  userId: string;
  email: string;
};

@Injectable()
export class AuthService {
  private readonly bcryptRounds: number;

  public constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
    private readonly jwtService: JwtService,
    configService: ConfigService,
  ) {
    const rounds = configService.get<number>('SSO_BCRYPT_ROUNDS') ?? 10;
    this.bcryptRounds = rounds;
  }

  public async register(dto: RegisterRequestDto): Promise<RegisterResponseDto> {
    const normalizedEmail = dto.email.toLowerCase().trim();
    const existingUser = await this.usersRepository.findOne({ where: { email: normalizedEmail } });

    if (existingUser) {
      throw new ConflictException({
        code: 'EMAIL_ALREADY_EXISTS',
        message: 'Email already registered',
      });
    }

    const hashedPassword = await bcrypt.hash(dto.password, this.bcryptRounds);
    const user = this.usersRepository.create({
      email: normalizedEmail,
      password: hashedPassword,
    });
    const savedUser = await this.usersRepository.save(user);

    return {
      id: savedUser.id,
      email: savedUser.email,
      createdAt: savedUser.createdAt.toISOString(),
    };
  }

  public async login(dto: LoginRequestDto): Promise<AuthResponseDto> {
    const normalizedEmail = dto.email.toLowerCase().trim();
    const user = await this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email: normalizedEmail })
      .getOne();

    if (!user) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      });
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      });
    }

    const payload: AuthPayload = { userId: user.id, email: user.email };
    const accessToken = this.jwtService.sign(payload, {
      algorithm: 'HS256',
      expiresIn: '24h',
    });

    return {
      accessToken,
      expiresIn: 86_400,
    };
  }
}

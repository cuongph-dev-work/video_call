import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Redis } from 'ioredis';
import * as bcrypt from 'bcryptjs';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

export interface User {
  id: string;
  email: string;
  displayName: string;
  avatar?: string;
  createdAt: number;
}

export interface JwtPayload {
  sub: string;
  email: string;
  displayName: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRedis() private readonly redis: Redis,
    private readonly jwtService: JwtService,
  ) {}

  private getUserKey(userId: string): string {
    return `user:${userId}`;
  }

  private getEmailKey(email: string): string {
    return `user:email:${email.toLowerCase()}`;
  }

  async register(
    registerDto: RegisterDto,
  ): Promise<{ user: User; token: string }> {
    const { email, password, displayName } = registerDto;

    // Check if user exists
    const existingUserId = await this.redis.get(this.getEmailKey(email));
    if (existingUserId) {
      throw new UnauthorizedException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const user: User = {
      id: userId,
      email: email.toLowerCase(),
      displayName,
      createdAt: Date.now(),
    };

    // Store user data
    await this.redis.hset(this.getUserKey(userId), {
      id: userId,
      email: user.email,
      displayName: user.displayName,
      password: hashedPassword,
      createdAt: user.createdAt.toString(),
    });

    // Store email -> userId mapping
    await this.redis.set(this.getEmailKey(email), userId);

    // Generate JWT token
    const payload: JwtPayload = {
      sub: userId,
      email: user.email,
      displayName: user.displayName,
    };
    const token = this.jwtService.sign(payload);

    return { user, token };
  }

  async login(loginDto: LoginDto): Promise<{ user: User; token: string }> {
    const { email, password } = loginDto;

    // Find user by email
    const userId = await this.redis.get(this.getEmailKey(email));
    if (!userId) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Get user data
    const userData = await this.redis.hgetall(this.getUserKey(userId));
    if (!userData || !userData.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, userData.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const user: User = {
      id: userData.id,
      email: userData.email,
      displayName: userData.displayName,
      createdAt: parseInt(userData.createdAt || '0', 10),
    };

    // Generate JWT token
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      displayName: user.displayName,
    };
    const token = this.jwtService.sign(payload);

    return { user, token };
  }

  async validateUser(userId: string): Promise<User | null> {
    const userData = await this.redis.hgetall(this.getUserKey(userId));
    if (!userData || !userData.id) {
      return null;
    }

    return {
      id: userData.id,
      email: userData.email,
      displayName: userData.displayName,
      createdAt: parseInt(userData.createdAt || '0', 10),
    };
  }
}

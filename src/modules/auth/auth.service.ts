import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { User } from '../../database/entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { GmailService } from '../emails/services/gmail.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private gmailService: GmailService,
  ) { }

  async register(registerDto: RegisterDto) {
    const existingUser = await this.userRepository.findOne({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    const user = this.userRepository.create({
      email: registerDto.email,
      name: registerDto.name,
      password: hashedPassword,
    });

    await this.userRepository.save(user);

    const tokens = await this.generateTokens(user);
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      ...tokens,
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.userRepository.findOne({
      where: { email: loginDto.email },
    });

    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.generateTokens(user);
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      ...tokens,
    };
  }

  async googleLogin(googleToken: string) {
    try {
      // Verify Google token with Google's userinfo endpoint (works with access_token)
      const response = await fetch(
        `https://www.googleapis.com/oauth2/v3/userinfo?access_token=${googleToken}`,
      );

      if (!response.ok) {
        throw new UnauthorizedException('Invalid Google token');
      }

      const payload = await response.json();

      if (!payload.email) {
        throw new UnauthorizedException('Invalid Google token - no email');
      }

      let user = await this.userRepository.findOne({
        where: { email: payload.email },
      });

      if (!user) {
        user = this.userRepository.create({
          email: payload.email,
          name: payload.name || payload.email.split('@')[0],
          googleId: payload.sub,
        });
        await this.userRepository.save(user);
      } else if (!user.googleId) {
        user.googleId = payload.sub;
        await this.userRepository.save(user);
      }

      const tokens = await this.generateTokens(user);
      await this.updateRefreshToken(user.id, tokens.refreshToken);

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        ...tokens,
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid Google token');
    }
  }

  async refreshToken(userId: string, refreshToken: string) {
    console.log(`[AuthService] Refreshing token for user ${userId}`);
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      console.log(`[AuthService] User ${userId} not found`);
    } else {
      console.log(`[AuthService] User found. Has refresh token in DB: ${!!user.refreshToken}`);
    }

    if (!user || !user.refreshToken) {
      console.log('[AuthService] Refresh failed: User not found or DB refresh token is null');
      throw new UnauthorizedException('Invalid refresh token');
    }

    const isRefreshTokenValid = await bcrypt.compare(
      refreshToken,
      user.refreshToken,
    );

    if (!isRefreshTokenValid) {
      console.log('[AuthService] Refresh failed: Token mismatch');
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokens = await this.generateTokens(user);
    await this.updateRefreshToken(user.id, tokens.refreshToken);
    console.log(`[AuthService] Token refreshed successfully for user ${userId}`);

    return tokens;
  }

  async logout(userId: string) {
    console.log(`[AuthService] Logging out user ${userId}`);
    await this.userRepository.update(userId, { refreshToken: null });
    console.log(`[AuthService] Set refreshToken to null for user ${userId}`);
    return { message: 'Logged out successfully' };
  }

  /**
   * Get Gmail OAuth URL
   */
  getGmailAuthUrl(frontendUrl?: string): string {
    const state = frontendUrl ? Buffer.from(frontendUrl).toString('base64') : '';
    return this.gmailService.getAuthUrl(state);
  }

  /**
   * Handle Gmail OAuth callback
   */
  async handleGmailCallback(code: string) {
    try {
      // Exchange code for tokens
      const tokens = await this.gmailService.exchangeCodeForTokens(code);

      if (!tokens.access_token || !tokens.refresh_token) {
        throw new UnauthorizedException('Failed to obtain Gmail tokens');
      }

      // Get user info from Gmail
      const userProfile = await this.gmailService.getUserProfile(
        tokens.access_token,
        tokens.refresh_token,
      );

      const email = userProfile.emailAddress;
      if (!email) {
        throw new UnauthorizedException('Failed to get email from Gmail');
      }

      // Find or create user
      let user = await this.userRepository.findOne({
        where: { email },
      });

      if (!user) {
        user = this.userRepository.create({
          email,
          name: email.split('@')[0],
          googleId: userProfile.emailAddress,
        });
      }

      // Store Gmail tokens
      user.gmailAccessToken = tokens.access_token;
      user.gmailRefreshToken = tokens.refresh_token;

      if (tokens.expiry_date) {
        user.gmailTokenExpiry = new Date(tokens.expiry_date);
      }

      await this.userRepository.save(user);

      // Generate app tokens
      const appTokens = await this.generateTokens(user);
      await this.updateRefreshToken(user.id, appTokens.refreshToken);

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        ...appTokens,
      };
    } catch (error) {
      throw new UnauthorizedException('Gmail authentication failed');
    }
  }

  /**
   * Refresh Gmail access token for a user
   */
  async refreshGmailToken(userId: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user || !user.gmailRefreshToken) {
      throw new UnauthorizedException('Gmail not connected');
    }

    try {
      const tokens = await this.gmailService.refreshAccessToken(
        user.gmailRefreshToken,
      );

      user.gmailAccessToken = tokens.access_token;

      if (tokens.expiry_date) {
        user.gmailTokenExpiry = new Date(tokens.expiry_date);
      }

      await this.userRepository.save(user);
    } catch (error) {
      throw new UnauthorizedException('Failed to refresh Gmail token');
    }
  }

  /**
   * Get user's Gmail tokens
   */
  async getGmailTokens(userId: string): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user || !user.gmailAccessToken || !user.gmailRefreshToken) {
      throw new UnauthorizedException('Gmail not connected');
    }

    // Check if token needs refresh (5 minutes before expiry)
    if (user.gmailTokenExpiry) {
      const now = new Date();
      const expiryWithBuffer = new Date(user.gmailTokenExpiry.getTime() - 5 * 60 * 1000);

      if (now >= expiryWithBuffer) {
        await this.refreshGmailToken(userId);

        // Fetch updated user
        const updatedUser = await this.userRepository.findOne({
          where: { id: userId },
        });

        return {
          accessToken: updatedUser.gmailAccessToken,
          refreshToken: updatedUser.gmailRefreshToken,
        };
      }
    }

    return {
      accessToken: user.gmailAccessToken,
      refreshToken: user.gmailRefreshToken,
    };
  }

  private async generateTokens(user: User) {
    const payload = { sub: user.id, email: user.email, role: user.role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: this.configService.get<string>('JWT_EXPIRATION'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRATION'),
      }),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  private async updateRefreshToken(userId: string, refreshToken: string) {
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await this.userRepository.update(userId, {
      refreshToken: hashedRefreshToken,
    });
  }
}

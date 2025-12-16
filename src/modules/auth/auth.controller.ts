import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Query,
  Res,
  Headers,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { EmailsService } from '../emails/services/emails.service';
import { KanbanService } from '../emails/services/kanban.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    @Inject(forwardRef(() => EmailsService))
    private emailsService: EmailsService,
    @Inject(forwardRef(() => KanbanService))
    private kanbanService: KanbanService,
  ) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User successfully registered' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, description: 'Successfully logged in' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('google')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with Google' })
  @ApiResponse({ status: 200, description: 'Successfully logged in with Google' })
  @ApiResponse({ status: 401, description: 'Invalid Google token' })
  async googleLogin(@Body() googleAuthDto: GoogleAuthDto) {
    return this.authService.googleLogin(googleAuthDto.token);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token successfully refreshed' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refresh(@Body() body: { refreshToken: string }) {
    const decoded = await this.authService['jwtService'].decode(
      body.refreshToken,
    );
    return this.authService.refreshToken(decoded.sub, body.refreshToken);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(@Request() req) {
    const { password, refreshToken, ...userWithoutSensitive } = req.user;
    return userWithoutSensitive;
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout user' })
  @ApiResponse({ status: 200, description: 'Successfully logged out' })
  async logout(@Request() req) {
    return this.authService.logout(req.user.id);
  }

  @Get('google/gmail-url')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get Gmail OAuth URL' })
  @ApiResponse({ status: 200, description: 'Gmail OAuth URL generated' })
  getGmailAuthUrl(
    @Query('frontendUrl') frontendUrl?: string, 
    @Request() req?: any,
    @Headers('mock') mockHeader?: string
  ) {
    // Mock mode - return fake URL
    if (mockHeader === 'true') {
      return { 
        data: { 
          url: `${frontendUrl || 'http://localhost:5173'}?mock=true&auth=success` 
        } 
      };
    }
    
    // Use query param or referer header to detect frontend URL
    const detectedFrontendUrl = frontendUrl || req?.headers?.referer || req?.headers?.origin;
    const url = this.authService.getGmailAuthUrl(detectedFrontendUrl);
    return { data: { url } };
  }

  @Get('google/gmail-callback')
  @ApiOperation({ summary: 'Handle Gmail OAuth callback' })
  @ApiResponse({ status: 200, description: 'Successfully authenticated with Gmail' })
  @ApiResponse({ status: 401, description: 'Gmail authentication failed' })
  async handleGmailCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res({ passthrough: false }) res: any
  ) {
    try {
      const result = await this.authService.handleGmailCallback(code);
      
      // Sync emails (always, to get new emails on each login) and initialize Kanban board
      try {
        await Promise.all([
          this.emailsService.syncInitialEmails(result.user.id),
          this.kanbanService.initializeKanbanBoard(result.user.id),
        ]);
        
        // Sync emails to Kanban board cards
        await this.kanbanService.syncEmailsToBoard(result.user.id);
      } catch (err) {
        console.error('Error syncing emails or initializing Kanban board:', err);
        // Don't fail login if sync fails
      }
      
      // Decode frontend URL from state parameter
      let frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      
      if (state) {
        try {
          frontendUrl = Buffer.from(state, 'base64').toString('utf-8');
        } catch (e) {
          // If state decode fails, use default
        }
      }
      
      const data = encodeURIComponent(JSON.stringify(result));
      
      // Redirect back to where the user came from
      return res.redirect(`${frontendUrl}?auth=success#${data}`);
    } catch (error) {
      let frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      
      if (state) {
        try {
          frontendUrl = Buffer.from(state, 'base64').toString('utf-8');
        } catch (e) {
          // If state decode fails, use default
        }
      }
      
      return res.redirect(`${frontendUrl}?auth=error&message=${encodeURIComponent(error.message)}`);
    }
  }
}

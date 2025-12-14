import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SmtpConfig } from '../../database/entities/smtp-config.entity';
import { User } from '../../database/entities/user.entity';
import { CreateSmtpConfigDto } from './dto/create-smtp-config.dto';
import { UpdateSmtpConfigDto } from './dto/update-smtp-config.dto';
import { SmtpService } from './smtp.service';
import { ImapService } from './imap.service';

@Injectable()
export class SmtpConfigService {
  constructor(
    @InjectRepository(SmtpConfig)
    private smtpConfigRepository: Repository<SmtpConfig>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private smtpService: SmtpService,
    private imapService: ImapService,
  ) {}

  /**
   * Create SMTP configuration
   */
  async createConfig(userId: string, dto: CreateSmtpConfigDto) {
    // Verify SMTP connection before saving
    await this.smtpService.verifyConnection({
      host: dto.smtpHost,
      port: dto.smtpPort || 587,
      secure: dto.smtpSecure || false,
      auth: {
        user: dto.smtpUsername,
        pass: dto.smtpPassword,
      },
    });

    // If this is set as default, unset other defaults
    if (dto.isDefault) {
      await this.smtpConfigRepository.update(
        { userId, isDefault: true },
        { isDefault: false },
      );

      // Update user email provider
      await this.userRepository.update(userId, { emailProvider: 'smtp' });
    }

    const config = this.smtpConfigRepository.create({
      userId,
      ...dto,
      imapPort: dto.imapPort || 993,
      imapSecure: dto.imapSecure !== undefined ? dto.imapSecure : true,
      smtpPort: dto.smtpPort || 587,
      smtpSecure: dto.smtpSecure || false,
      isDefault: dto.isDefault || false,
    });

    return this.smtpConfigRepository.save(config);
  }

  /**
   * Get all SMTP configurations for user
   */
  async getConfigs(userId: string) {
    return this.smtpConfigRepository.find({
      where: { userId },
      select: [
        'id',
        'emailAddress',
        'displayName',
        'imapHost',
        'imapPort',
        'smtpHost',
        'smtpPort',
        'isActive',
        'isDefault',
        'createdAt',
        'updatedAt',
      ],
    });
  }

  /**
   * Get SMTP configuration by ID
   */
  async getConfigById(userId: string, configId: string) {
    return this.smtpConfigRepository.findOne({
      where: { id: configId, userId },
      select: [
        'id',
        'emailAddress',
        'displayName',
        'imapHost',
        'imapPort',
        'smtpHost',
        'smtpPort',
        'isActive',
        'isDefault',
        'createdAt',
        'updatedAt',
      ],
    });
  }

  /**
   * Update SMTP configuration
   */
  async updateConfig(userId: string, configId: string, dto: UpdateSmtpConfigDto) {
    const config = await this.smtpConfigRepository.findOne({
      where: { id: configId, userId },
    });

    if (!config) {
      throw new Error('Configuration not found');
    }

    // If updating to default, unset other defaults
    if (dto.isDefault) {
      await this.smtpConfigRepository.update(
        { userId, isDefault: true },
        { isDefault: false },
      );

      // Update user email provider
      await this.userRepository.update(userId, { emailProvider: 'smtp' });
    }

    Object.assign(config, dto);
    return this.smtpConfigRepository.save(config);
  }

  /**
   * Delete SMTP configuration
   */
  async deleteConfig(userId: string, configId: string) {
    const config = await this.smtpConfigRepository.findOne({
      where: { id: configId, userId },
    });

    if (!config) {
      throw new Error('Configuration not found');
    }

    // If deleting default config, switch back to Gmail
    if (config.isDefault) {
      await this.userRepository.update(userId, { emailProvider: 'gmail' });
    }

    await this.smtpConfigRepository.remove(config);
    return { message: 'Configuration deleted successfully' };
  }

  /**
   * Test SMTP configuration
   */
  async testConfig(userId: string, configId: string) {
    const config = await this.smtpConfigRepository.findOne({
      where: { id: configId, userId },
    });

    if (!config) {
      throw new Error('Configuration not found');
    }

    // Test SMTP connection
    await this.smtpService.verifyConnection({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpSecure,
      auth: {
        user: config.smtpUsername,
        pass: config.smtpPassword,
      },
    });

    return { message: 'Connection successful' };
  }

  /**
   * Set default configuration
   */
  async setDefault(userId: string, configId: string) {
    // Unset current defaults
    await this.smtpConfigRepository.update(
      { userId, isDefault: true },
      { isDefault: false },
    );

    // Set new default
    await this.smtpConfigRepository.update(
      { id: configId, userId },
      { isDefault: true },
    );

    // Update user email provider
    await this.userRepository.update(userId, { emailProvider: 'smtp' });

    return { message: 'Default configuration updated' };
  }
}

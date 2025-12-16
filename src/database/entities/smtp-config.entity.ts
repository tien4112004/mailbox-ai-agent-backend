import {
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('smtp_configs')
export class SmtpConfig {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'email_address' })
  emailAddress: string;

  @Column({ name: 'display_name', nullable: true })
  displayName: string;

  // IMAP Configuration
  @Column({ name: 'imap_host' })
  imapHost: string;

  @Column({ name: 'imap_port', default: 993 })
  imapPort: number;

  @Column({ name: 'imap_secure', default: true })
  imapSecure: boolean;

  @Column({ name: 'imap_username' })
  imapUsername: string;

  @Column({ name: 'imap_password', type: 'text' })
  imapPassword: string;

  // SMTP Configuration
  @Column({ name: 'smtp_host' })
  smtpHost: string;

  @Column({ name: 'smtp_port', default: 587 })
  smtpPort: number;

  @Column({ name: 'smtp_secure', default: false })
  smtpSecure: boolean;

  @Column({ name: 'smtp_username' })
  smtpUsername: string;

  @Column({ name: 'smtp_password', type: 'text' })
  smtpPassword: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'is_default', default: false })
  isDefault: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

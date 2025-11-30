import { Module, forwardRef } from '@nestjs/common';
import { EmailsController } from './emails.controller';
import { EmailsService } from './emails.service';
import { GmailService } from './gmail.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [forwardRef(() => AuthModule)],
  controllers: [EmailsController],
  providers: [EmailsService, GmailService],
  exports: [GmailService],
})
export class EmailsModule {}

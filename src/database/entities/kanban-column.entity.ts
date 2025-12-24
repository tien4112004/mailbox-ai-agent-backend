import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { User } from './user.entity';

@Entity('kanban_columns')
@Index(['userId', 'isActive'])
export class KanbanColumn {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: false })
  order: number;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  color: string;

  @Column({ name: 'label_id', nullable: true })
  labelId?: string;

  @Column({ type: 'varchar', default: 'inbox' })
  status: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, (user) => user.kanbanColumns, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @OneToMany('KanbanCard', (card: any) => card.column, { onDelete: 'CASCADE' })
  cards: any[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

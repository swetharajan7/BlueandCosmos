import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface SupportTicketAttributes {
  id: string;
  user_id: string;
  subject: string;
  description: string;
  category: 'technical' | 'account' | 'application' | 'billing' | 'general';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'waiting_for_user' | 'resolved' | 'closed';
  assigned_to?: string;
  user_email: string;
  user_name: string;
  user_role: 'student' | 'recommender' | 'admin';
  context_data?: any; // JSON field for additional context
  attachments?: string[]; // Array of file URLs
  created_at: Date;
  updated_at: Date;
  resolved_at?: Date;
  closed_at?: Date;
}

export interface SupportTicketCreationAttributes 
  extends Optional<SupportTicketAttributes, 'id' | 'created_at' | 'updated_at' | 'resolved_at' | 'closed_at' | 'assigned_to' | 'attachments'> {}

export class SupportTicket extends Model<SupportTicketAttributes, SupportTicketCreationAttributes> 
  implements SupportTicketAttributes {
  public id!: string;
  public user_id!: string;
  public subject!: string;
  public description!: string;
  public category!: 'technical' | 'account' | 'application' | 'billing' | 'general';
  public priority!: 'low' | 'medium' | 'high' | 'urgent';
  public status!: 'open' | 'in_progress' | 'waiting_for_user' | 'resolved' | 'closed';
  public assigned_to?: string;
  public user_email!: string;
  public user_name!: string;
  public user_role!: 'student' | 'recommender' | 'admin';
  public context_data?: any;
  public attachments?: string[];
  public created_at!: Date;
  public updated_at!: Date;
  public resolved_at?: Date;
  public closed_at?: Date;
}

SupportTicket.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    subject: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        len: [1, 255],
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        len: [10, 5000],
      },
    },
    category: {
      type: DataTypes.ENUM('technical', 'account', 'application', 'billing', 'general'),
      allowNull: false,
      defaultValue: 'general',
    },
    priority: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
      allowNull: false,
      defaultValue: 'medium',
    },
    status: {
      type: DataTypes.ENUM('open', 'in_progress', 'waiting_for_user', 'resolved', 'closed'),
      allowNull: false,
      defaultValue: 'open',
    },
    assigned_to: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    user_email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        isEmail: true,
      },
    },
    user_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    user_role: {
      type: DataTypes.ENUM('student', 'recommender', 'admin'),
      allowNull: false,
    },
    context_data: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    attachments: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    resolved_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    closed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'support_tickets',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['user_id'],
      },
      {
        fields: ['status'],
      },
      {
        fields: ['category'],
      },
      {
        fields: ['priority'],
      },
      {
        fields: ['assigned_to'],
      },
      {
        fields: ['created_at'],
      },
    ],
  }
);

export default SupportTicket;
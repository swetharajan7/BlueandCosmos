import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface SupportTicketMessageAttributes {
  id: string;
  ticket_id: string;
  sender_id: string;
  sender_name: string;
  sender_role: 'user' | 'support' | 'system';
  message: string;
  is_internal: boolean; // Internal notes not visible to user
  attachments?: string[];
  created_at: Date;
  updated_at: Date;
}

export interface SupportTicketMessageCreationAttributes 
  extends Optional<SupportTicketMessageAttributes, 'id' | 'created_at' | 'updated_at' | 'attachments'> {}

export class SupportTicketMessage extends Model<SupportTicketMessageAttributes, SupportTicketMessageCreationAttributes> 
  implements SupportTicketMessageAttributes {
  public id!: string;
  public ticket_id!: string;
  public sender_id!: string;
  public sender_name!: string;
  public sender_role!: 'user' | 'support' | 'system';
  public message!: string;
  public is_internal!: boolean;
  public attachments?: string[];
  public created_at!: Date;
  public updated_at!: Date;
}

SupportTicketMessage.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    ticket_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'support_tickets',
        key: 'id',
      },
    },
    sender_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    sender_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    sender_role: {
      type: DataTypes.ENUM('user', 'support', 'system'),
      allowNull: false,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        len: [1, 5000],
      },
    },
    is_internal: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
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
  },
  {
    sequelize,
    tableName: 'support_ticket_messages',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['ticket_id'],
      },
      {
        fields: ['sender_id'],
      },
      {
        fields: ['created_at'],
      },
    ],
  }
);

export default SupportTicketMessage;
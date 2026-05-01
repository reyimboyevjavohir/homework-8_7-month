import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

export enum UserStep {
  WAITING_NAME = 'WAITING_NAME',
  WAITING_PHONE = 'WAITING_PHONE',
  WAITING_LOCATION = 'WAITING_LOCATION',
  REGISTERED = 'REGISTERED',
}

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true })
  telegramId: number;

  @Prop()
  name: string;

  @Prop()
  phone: string;

  @Prop({ type: Object })
  location: {
    latitude: number;
    longitude: number;
  };

  @Prop({ default: UserStep.WAITING_NAME })
  step: UserStep;

  @Prop({ default: false })
  isRegistered: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type OrderDocument = Order & Document;

export interface OrderItem {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
}

@Schema({ timestamps: true })
export class Order {
  @Prop({ required: true })
  telegramId: number;

  @Prop({ type: Array, default: [] })
  items: OrderItem[];

  @Prop({ default: 0 })
  totalPrice: number;

  @Prop({ default: 'pending' })
  status: string;
}

export const OrderSchema = SchemaFactory.createForClass(Order);

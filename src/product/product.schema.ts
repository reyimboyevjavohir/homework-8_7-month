import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ProductDocument = Product & Document;

export enum ProductCategory {
  DRINKS = 'Ichimliklar',
  FOOD = 'Yeguliklar',
  SWEETS = 'Shirinliklar',
}

@Schema()
export class Product {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  price: number;

  @Prop({ required: true })
  category: ProductCategory;

  @Prop()
  description: string;

  @Prop()
  imageUrl: string;
}

export const ProductSchema = SchemaFactory.createForClass(Product);

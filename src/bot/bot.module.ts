import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BotService } from './bot.service';
import { User, UserSchema } from '../user/user.schema';
import { Product, ProductSchema } from '../product/product.schema';
import { Order, OrderSchema } from '../order/order.schema';
import { ProductService } from '../product/product.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Order.name, schema: OrderSchema },
    ]),
  ],
  providers: [BotService, ProductService],
})
export class BotModule {}

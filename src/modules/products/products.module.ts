import { Module } from '@nestjs/common';
import { ProductsController } from './infrastructure/http/products.controller';
import { ProductsService } from './application/products.service';
import { PrismaProductRepository } from './infrastructure/persistence/prisma-product.repository';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CloudinaryModule } from 'src/modules/cloudinary/cloudinary.module';

@Module({
  imports: [PrismaModule, CloudinaryModule],
  controllers: [ProductsController],
  providers: [
    {
      provide: 'ProductRepository',
      useClass: PrismaProductRepository,
    },
    ProductsService,
  ],
  exports: ['ProductRepository'],
})
export class ProductsModule {}

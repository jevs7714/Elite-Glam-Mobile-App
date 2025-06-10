import { Controller, Get, Post, Body, Param, Delete, Put, BadRequestException, Query, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { ImageKitService } from '../imagekit/imagekit.service';

@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly imageKitService: ImageKitService,
  ) {}

  @Post()
  @UseInterceptors(FileInterceptor('image', {
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB limit
    },
  }))
  async create(
    @Body() formData: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    try {
      console.log('Received create product request with data:', formData);
      console.log('Received file:', file ? {
        filename: file.originalname,
        mimetype: file.mimetype,
        size: file.size
      } : 'No file');
      
      // Parse and validate the form data
      const createProductDto: CreateProductDto = {
        name: formData.name,
        price: Number(formData.price),
        description: formData.description,
        category: formData.category,
        quantity: Number(formData.quantity),
        userId: formData.userId,
        rating: Number(formData.rating) || 0,
      };
      
      // Validate numeric fields
      if (isNaN(createProductDto.price) || createProductDto.price < 0) {
        throw new BadRequestException('Price must be a positive number');
      }
      
      if (isNaN(createProductDto.quantity) || createProductDto.quantity < 0) {
        throw new BadRequestException('Quantity must be a non-negative number');
      }

      // Handle image if provided
      if (file) {
        // Upload to ImageKit
        const imageKitResult = await this.imageKitService.uploadImage(file, 'products', true);
        console.log('Generated image URL:', imageKitResult.url);
        createProductDto.image = imageKitResult.url;
        createProductDto.imageFileId = imageKitResult.fileId;
      }

      const result = await this.productsService.create(createProductDto);
      console.log('Product created successfully:', result);
      return result;
    } catch (error) {
      console.error('Error in create product controller:', error);
      throw error;
    }
  }

  @Get()
  async findAll(
    @Query('userId') userId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('categories') categories?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('minRating') minRating?: string,
    @Query('search') search?: string,
  ) {
    try {
      const pageNumber = page ? parseInt(page, 10) : 1;
      const limitNumber = limit ? parseInt(limit, 10) : 8;
      const minPriceNumber = minPrice ? parseFloat(minPrice) : undefined;
      const maxPriceNumber = maxPrice ? parseFloat(maxPrice) : undefined;
      const minRatingNumber = minRating ? parseFloat(minRating) : undefined;
      const categoryList = categories ? categories.split(',') : undefined;

      console.log('Fetching products with params:', { 
        userId, 
        page: pageNumber, 
        limit: limitNumber, 
        categories: categoryList,
        minPrice: minPriceNumber,
        maxPrice: maxPriceNumber,
        minRating: minRatingNumber,
        search 
      });

      const products = await this.productsService.findAll({
        userId,
        page: pageNumber,
        limit: limitNumber,
        categories: categoryList,
        minPrice: minPriceNumber,
        maxPrice: maxPriceNumber,
        minRating: minRatingNumber,
        search,
      });
      console.log(`Found ${products.length} products`);
      return products;
    } catch (error) {
      console.error('Error fetching products:', error);
      throw error;
    }
  }

  @Get(':id/from-same-shop')
  async findFromSameShop(
    @Param('id') id: string,
    @Query('limit') limit?: string,
  ) {
    try {
      console.log(`Fetching products from the same shop as product ${id}`);
      const products = await this.productsService.findFromSameShop(
        id,
        limit ? parseInt(limit, 10) : 5,
      );
      console.log(`Found ${products.length} products from the same shop.`);
      return products;
    } catch (error) {
      console.error('Error in findFromSameShop controller:', error);
      throw error;
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      console.log('Fetching product with ID:', id);
      const product = await this.productsService.findOne(id);
      console.log('Found product:', product);
      return product;
    } catch (error) {
      console.error('Error fetching product:', error);
      throw error;
    }
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateProductDto: Partial<CreateProductDto>) {
    try {
      console.log('Updating product with ID:', id, 'Data:', updateProductDto);
      await this.productsService.update(id, updateProductDto);
      console.log('Product updated successfully');
      return { message: 'Product updated successfully' };
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      console.log('Deleting product with ID:', id);
      await this.productsService.remove(id);
      console.log('Product deleted successfully');
      return { message: 'Product deleted successfully' };
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  }
} 
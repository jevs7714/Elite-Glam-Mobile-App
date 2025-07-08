import { Controller, Get, Post, Body, Param, Delete, Put, BadRequestException, Query, UseInterceptors, UploadedFile, UploadedFiles } from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
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
  @UseInterceptors(FilesInterceptor('images', 5, {
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB limit per file
    },
  }))
  async create(
    @Body() formData: any,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    try {
      console.log('Received create product request with data:', formData);
      console.log('Received files:', files ? files.map(f => ({
        filename: f.originalname,
        mimetype: f.mimetype,
        size: f.size
      })) : 'No files');
      
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

      // Handle multiple images if provided
      if (files && files.length > 0) {
        const imageUrls: string[] = [];
        const imageFileIds: string[] = [];
        
        // Upload all images to ImageKit
        for (const file of files) {
          const imageKitResult = await this.imageKitService.uploadImage(file, 'products', true);
          console.log('Generated image URL:', imageKitResult.url);
          imageUrls.push(imageKitResult.url);
          imageFileIds.push(imageKitResult.fileId);
        }
        
        // Set the first image as the main image for backward compatibility
        createProductDto.image = imageUrls[0];
        createProductDto.imageFileId = imageFileIds[0];
        
        // Set all images in the images array
        createProductDto.images = imageUrls;
        createProductDto.imageFileIds = imageFileIds;
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

  @Put(':id/quantity')
  async updateQuantity(@Param('id') id: string, @Body() body: { quantity: number }) {
    try {
      console.log('Updating product quantity with ID:', id, 'New quantity:', body.quantity);
      
      if (typeof body.quantity !== 'number' || body.quantity < 0) {
        throw new BadRequestException('Quantity must be a non-negative number');
      }
      
      await this.productsService.updateQuantity(id, body.quantity);
      console.log('Product quantity updated successfully');
      return { message: 'Product quantity updated successfully' };
    } catch (error) {
      console.error('Error updating product quantity:', error);
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
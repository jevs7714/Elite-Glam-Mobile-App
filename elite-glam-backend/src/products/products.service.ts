import { Injectable, NotFoundException, InternalServerErrorException, OnModuleInit } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { ImageKitService } from '../imagekit/imagekit.service';
import { FirebaseService } from '../firebase/firebase.service';

export interface Product extends CreateProductDto {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  sellerName?: string;
  sellerPhoto?: string;
  imageFileId?: string;
  available: boolean; // Added available status
}

const SAMPLE_PRODUCTS: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Elegant Evening Gown',
    price: 2999.99,
    description: 'A stunning evening gown perfect for special occasions',
    category: 'gown',
    quantity: 5,
    rating: 4.5,
    image: 'https://example.com/gown1.jpg',
    condition: 'new',
    sellerMessage: 'Perfect for weddings and formal events',
    rentAvailable: true,
    userId: 'sample-user-1',
    available: true // quantity: 5 > 0
  },
  {
    name: 'Classic Business Suit',
    price: 1999.99,
    description: 'A professional business suit for formal occasions',
    category: 'suit',
    quantity: 3,
    rating: 4.8,
    image: 'https://example.com/suit1.jpg',
    condition: 'new',
    sellerMessage: 'Ideal for business meetings and interviews',
    rentAvailable: true,
    userId: 'sample-user-1',
    available: true // quantity: 3 > 0
  },
  {
    name: 'Professional Makeup Kit',
    price: 999.99,
    description: 'Complete makeup kit for professional artists',
    category: 'makeup',
    quantity: 10,
    rating: 4.7,
    image: 'https://example.com/makeup1.jpg',
    condition: 'new',
    sellerMessage: 'Includes all essential products for professional makeup application',
    rentAvailable: false,
    userId: 'sample-user-1',
    available: true // quantity: 10 > 0
  }
];

interface FindAllOptions {
  userId?: string;
  page?: number;
  limit?: number;
  category?: string;
  search?: string;
}

@Injectable()
export class ProductsService implements OnModuleInit {
  private readonly COLLECTION = 'products';

  constructor(
    private readonly imageKitService: ImageKitService,
    private readonly firebaseService: FirebaseService,
  ) {}

  async onModuleInit() {
    try {
      console.log('Initializing ProductsService...');
      await this.initializeSampleProducts();
    } catch (error) {
      console.error('Error during ProductsService initialization:', error);
      // Don't throw the error to prevent application crash
    }
  }

  private async initializeSampleProducts() {
    try {
      console.log('Checking for existing products...');
      const existingProducts = await this.findAll();
      
      if (existingProducts.length === 0) {
        console.log('No products found. Initializing sample products...');
        for (const product of SAMPLE_PRODUCTS) {
          try {
            await this.create(product);
            console.log(`Created sample product: ${product.name}`);
          } catch (error) {
            console.error(`Error creating sample product ${product.name}:`, error);
          }
        }
        console.log('Sample products initialization completed');
      } else {
        console.log(`Found ${existingProducts.length} existing products`);
      }
    } catch (error) {
      console.error('Error in initializeSampleProducts:', error);
      // Don't throw the error to prevent application crash
    }
  }

  async create(createProductDto: CreateProductDto): Promise<Product> {
    try {
      console.log('Creating product with data:', createProductDto);
      // Create product in Firebase
      const id = await this.firebaseService.create(this.COLLECTION, {
        ...createProductDto,
        createdAt: new Date(),
        updatedAt: new Date(),
        imageFileId: createProductDto.imageFileId || null,
      });
      // Get the created product
      const product = await this.findOne(id);
      console.log('Product created successfully:', product);
      return product;
    } catch (error) {
      console.error('Error creating product:', error);
      throw new InternalServerErrorException(
        error.message || 'Failed to create product',
        { cause: error }
      );
    }
  }

  async findAll(options: FindAllOptions = {}): Promise<Product[]> {
    try {
      const { userId, page = 1, limit = 8, category, search } = options;
      console.log('Finding products with options:', options);

      // Get all products from Firebase
      let products = await this.firebaseService.findAll<Product>(this.COLLECTION);

      // Apply filters
      if (userId) {
        products = products.filter(product => product.userId === userId);
      }
      if (category) {
        products = products.filter(product => 
          product.category.toLowerCase() === category.toLowerCase()
        );
      }

      // Apply search filter (case-insensitive)
      console.log(`Products before search filter: ${products.length}`);
      if (search) {
        const searchTerm = search.toLowerCase();
        console.log(`Applying search filter with searchTerm: '${searchTerm}'`);
        products = products.filter(product => 
          (product.name && product.name.toLowerCase().includes(searchTerm)) ||
          (product.description && product.description.toLowerCase().includes(searchTerm))
        );
        console.log(`Products after search filter: ${products.length}`);
      }

      // Add 'available' property based on quantity
      const productsWithAvailability = products.map(p => ({
        ...p,
        available: p.quantity > 0,
      }));

      // Calculate pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedProducts = productsWithAvailability.slice(startIndex, endIndex);

      console.log(`Returning ${paginatedProducts.length} products for page ${page}`);
      return paginatedProducts;
    } catch (error) {
      console.error('Error fetching products:', error);
      throw error;
    }
  }

  async findOne(id: string): Promise<Product> {
    try {
    const product = await this.firebaseService.findById<Product>(this.COLLECTION, id);
    if (!product) {
      throw new NotFoundException(`Product with ID "${id}" not found`);
    }

      // Get seller information
      if (product.userId) {
        try {
          const seller = await this.firebaseService.getUserByUid(product.userId);
          if (seller) {
            product.sellerName = seller.username;
            product.sellerPhoto = seller.profile?.photoURL;
          }
        } catch (error) {
          console.error('Error fetching seller information:', error);
          // Don't throw error, just continue without seller info
        }
      }

    // Add available property
    const productWithAvailability = {
      ...product,
      available: product.quantity > 0,
    };

    return productWithAvailability;
    } catch (error) {
      console.error('Error fetching product:', error);
      throw error;
    }
  }

  async update(id: string, updateProductDto: Partial<CreateProductDto>): Promise<void> {
    try {
    const exists = await this.firebaseService.findById(this.COLLECTION, id);
    if (!exists) {
      throw new NotFoundException(`Product with ID "${id}" not found`);
    }
      await this.firebaseService.update(this.COLLECTION, id, {
        ...updateProductDto,
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    try {
      const product = await this.firebaseService.findById<Product>(this.COLLECTION, id);
      if (!product) {
      throw new NotFoundException(`Product with ID "${id}" not found`);
    }

      // Delete image from ImageKit if fileId exists
      if (product.imageFileId) {
        await this.imageKitService.deleteImage(product.imageFileId);
      }

      // Delete all ratings associated with this product
      const ratingsRef = await this.firebaseService.getCollection('ratings');
      const ratingsSnapshot = await ratingsRef
        .where('productId', '==', id)
        .get();

      console.log(`Found ${ratingsSnapshot.size} ratings to delete for product ${id}`);
      
      // Delete each rating
      const deletePromises = ratingsSnapshot.docs.map(doc => 
        this.firebaseService.delete('ratings', doc.id)
      );
      await Promise.all(deletePromises);

      // Update all bookings that reference this product's name
      const bookings = await this.firebaseService.findAll('bookings') as Array<{ id: string; serviceName: string; productImage?: string }>;
      const updatedBookings = bookings
        .filter(booking => booking.serviceName === product.name)
        .map(booking => ({
          ...booking,
          serviceName: 'Product not Available',
          productImage: null // Clear the product image
        }));

      console.log(`Found ${updatedBookings.length} bookings to update for product ${product.name}`);
      
      for (const booking of updatedBookings) {
        await this.firebaseService.update('bookings', booking.id, {
          serviceName: 'Product not Available',
          productImage: null, // Clear the product image
          updatedAt: new Date()
        });
      }

      // Finally delete the product
    await this.firebaseService.delete(this.COLLECTION, id);
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  }

  async findFromSameShop(productId: string, limit: number = 5): Promise<Product[]> {
    try {
      console.log(`Finding products from the same shop as product ID: ${productId}`);
      const originalProduct = await this.findOne(productId);
      if (!originalProduct.userId) {
        console.warn(`Product with ID "${productId}" does not have a seller associated.`);
        return []; // No seller, so no other products from the same shop
      }

      const sellerId = originalProduct.userId;
      console.log(`Original product's seller ID: ${sellerId}`);

      // Fetch all products from the same seller, without pagination for this internal call
      const allProductsFromSeller = await this.findAll({ userId: sellerId, limit: 50, page: 1 }); // Limit to 50 to be safe
      console.log(`Found ${allProductsFromSeller.length} total products from seller ${sellerId}`);

      // Filter out the original product and take the first 'limit' products
      const otherProducts = allProductsFromSeller
        .filter(product => product.id !== productId)
        .slice(0, limit);

      // Enhance products with average rating
      const productsWithRatings = await Promise.all(
        otherProducts.map(async (product) => {
          const ratingsRef = await this.firebaseService.getCollection('ratings');
          const ratingsQuery = ratingsRef.where('productId', '==', product.id);
          const ratingsSnapshot = await ratingsQuery.get();
          
          const ratings: { rating: number }[] = ratingsSnapshot.docs.map(doc => doc.data() as { rating: number });

          if (ratings.length > 0) {
            const sum = ratings.reduce((acc, curr) => acc + (curr.rating || 0), 0);
            product.rating = sum / ratings.length;
          } else {
            product.rating = 0;
          }

          return product;
        }),
      );

      console.log(`Returning ${productsWithRatings.length} other products from the same shop with ratings.`);
      return productsWithRatings;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error; // Re-throw not found exception
      }
      console.error(`Error finding products from the same shop for product ID ${productId}:`, error);
      throw new InternalServerErrorException('Failed to fetch products from the same shop.');
    }
  }
} 
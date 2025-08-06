export class DashboardStatsDto {
  users: {
    total: number;
    adminCount: number;
    customerCount: number;
    shopOwnerCount: number;
  };
  
  products: {
    total: number;
  };
  
  bookings: {
    total: number;
    pending: number;
  };
}
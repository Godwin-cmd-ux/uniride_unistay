export type Role = 'STUDENT' | 'DRIVER' | 'OWNER' | 'ADMIN';
export type PropertyType = 'HOSTEL' | 'HOUSE' | 'APARTMENT' | 'ROOM';
export type RideStatus =
  | 'REQUESTED'
  | 'ACCEPTED'
  | 'DRIVER_EN_ROUTE'
  | 'ON_TRIP'
  | 'COMPLETED'
  | 'CANCELLED';

export interface University {
  id: string;
  name: string;
  shortName: string;
  city: string;
  region: string;
  latitude: number;
  longitude: number;
  driverRadiusKm: number;
  propertyRadiusKm: number;
  propertyCount?: number;
  driverCount?: number;
  userCount?: number;
  status?: string;
}

export interface AuthUser {
  id: string;
  fullName: string;
  email: string | null;
  phone: string;
  role: Role;
  status: string;
  phoneVerified: boolean;
  universityId: string | null;
  avatarUrl: string | null;
  createdAt: string;
  universityShortName?: string | null;
  universityName?: string | null;
  studentIdNumber?: string | null;
  studentVerifiedAt?: string | null;
  driverVerificationStatus?: string | null;
  driverStatus?: string | null;
  ratingAvg?: number | null;
  completedRides?: number | null;
  licenseNumber?: string | null;
  nationalId?: string | null;
}

export interface PropertySummary {
  id: string;
  name: string;
  type: PropertyType;
  description: string;
  addressArea: string;
  priceFrom: number;
  amenities: string[];
  verifiedAt: string | null;
  createdAt: string;
  universityId: string;
  universityShortName: string;
  universityName: string;
  imageUrl: string | null;
  availableUnits: number;
  distanceM: number | null;
}

export interface PropertyImage {
  id: string;
  url: string;
  sortOrder: number;
}

export interface PropertyUnit {
  id: string;
  label: string;
  pricePerMonth: number;
  status: string;
  roomName?: string | null;
  bedLabel?: string | null;
}

export interface Room {
  id: string;
  name: string;
  capacity: number;
  pricePerMonth: number;
  hasBeds: boolean;
  bedCount?: number;
  status?: string;
}

export interface PropertyDetail {
  id: string;
  name: string;
  type: PropertyType;
  description: string;
  addressArea: string;
  priceFrom: number;
  amenities: string[];
  verifiedAt: string | null;
  createdAt: string;
  universityId: string;
  universityName: string;
  universityShortName: string;
  ownerDisplayName: string;
  distanceM: number | null;
  images: PropertyImage[];
  rooms: Room[];
  units: PropertyUnit[];
  reviews: { rating: number; comment: string; createdAt: string; reviewerName: string }[];
}

export interface Ride {
  id: string;
  studentId: string;
  universityId: string;
  driverId: string | null;
  pickupLabel: string;
  destLabel: string;
  distanceM: number;
  estimatedFare: number;
  finalFare: number | null;
  commissionRate: number;
  commissionAmount: number | null;
  driverEarnings: number | null;
  status: RideStatus;
  requestedAt: string;
  acceptedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  studentName: string;
  studentPhone: string;
  driverName: string | null;
  driverPhone: string | null;
  driverRating: number | null;
  vehiclePlate: string | null;
  vehicleMake: string | null;
  vehicleModel: string | null;
  vehicleType: string | null;
  universityShortName: string;
}

export interface DriverRequest {
  id: string;
  pickupLabel: string;
  destLabel: string;
  distanceM: number;
  estimatedFare: number;
  requestedAt: string;
  studentFirstName: string;
  driverDistanceToPickupM: number | null;
  universityShortName: string;
}

export interface Inquiry {
  id: string;
  propertyId: string;
  propertyName: string;
  propertyType: PropertyType;
  addressArea: string;
  imageUrl: string | null;
  unitLabel: string;
  pricePerMonth: number;
  moveInDate: string;
  durationMonths: number;
  message: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'WITHDRAWN';
  responseMessage: string | null;
  createdAt: string;
  respondedAt: string | null;
  ownerName: string;
  ownerPhone: string | null;
  bookingId: string | null;
  bookingStatus: string | null;
  startDate: string | null;
  endDate: string | null;
  totalAmount: number | null;
  monthlyRent: number | null;
}

export interface OwnerInquiry {
  id: string;
  propertyId: string;
  propertyName: string;
  addressArea: string;
  unitLabel: string;
  pricePerMonth: number;
  moveInDate: string;
  durationMonths: number;
  message: string;
  responseMessage: string | null;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'WITHDRAWN';
  createdAt: string;
  respondedAt: string | null;
  studentName: string;
  studentUniversity: string | null;
  studentPhone: string | null;
}

export interface Booking {
  id: string;
  propertyName: string;
  addressArea: string;
  propertyType?: PropertyType;
  unitLabel?: string;
  imageUrl?: string | null;
  studentName?: string;
  ownerName?: string;
  ownerPhone?: string;
  studentPhone?: string;
  studentUniversity?: string | null;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  totalAmount: number;
  successFee: number;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  confirmedAt: string;
  endedAt: string | null;
}

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}

export interface DriverProfile {
  userId: string;
  universityId: string;
  universityName: string;
  universityShortName: string;
  licenseNumber: string | null;
  licenseExpiry: string | null;
  nationalId: string | null;
  status: 'IDLE' | 'ON_ROAD' | 'OFFLINE' | 'REQUESTED';
  verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
  rejectionReason: string | null;
  ratingAvg: number;
  ratingCount: number;
  totalEarnings: number;
  completedRides: number;
  plateNumber: string | null;
  make: string | null;
  model: string | null;
  year: number | null;
  vehicleType: string | null;
  trackingDeviceId: string | null;
  insuranceExpiry: string | null;
  fullName: string;
  phone: string;
}

export interface DocumentItem {
  id: string;
  type: string;
  fileUrl: string;
  status: string;
  verifiedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export interface OwnerProperty {
  id: string;
  name: string;
  type: PropertyType;
  addressArea: string;
  priceFrom: number;
  status: 'PENDING' | 'ACTIVE' | 'REJECTED' | 'SUSPENDED' | 'ARCHIVED';
  verifiedAt: string | null;
  createdAt: string;
  universityShortName: string;
  imageUrl: string | null;
  availableUnits: number;
  totalUnits: number;
  pendingInquiries: number;
}

export interface OwnerPropertyDetail {
  property: {
    id: string;
    name: string;
    type: PropertyType;
    description: string;
    addressArea: string;
    priceFrom: number;
    status: string;
    universityId: string;
    amenities: string[];
    latitude: number | null;
    longitude: number | null;
    createdAt: string;
    verifiedAt: string | null;
  };
  images: PropertyImage[];
  rooms: Room[];
  units: (PropertyUnit & { roomId: string | null; bedId: string | null })[];
}

export interface Summary {
  universities: University[];
  stats: {
    universities: number;
    students: number;
    verifiedDrivers: number;
    activeProperties: number;
    completedRides: number;
    owners: number;
  };
  selected: (University & { driversAvailable: number; propertiesCount: number }) | null;
  sampleProperties: PropertySummary[];
  fare: FareConfig;
}

export interface FareConfig {
  currency: string;
  baseFare: number;
  perKm: number;
  minimumFare: number;
  commissionRate: number;
  accommodationSuccessFeeRate: number;
  note: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AdminMetrics {
  students: number;
  drivers: number;
  owners: number;
  admins: number;
  suspendedUsers: number;
  pendingDrivers: number;
  verifiedDrivers: number;
  onlineDrivers: number;
  activeProperties: number;
  pendingProperties: number;
  totalRides: number;
  completedRides: number;
  ridesToday: number;
  liveRides: number;
  pendingInquiries: number;
  activeStays: number;
  openComplaints: number;
  newContactMessages: number;
  rideCommission: number;
  accommodationFees: number;
}

export interface AdminOverview {
  metrics: AdminMetrics;
  recentRides: Ride[];
  recentInquiries: {
    id: string;
    status: string;
    createdAt: string;
    propertyName: string;
    studentFirstName: string;
  }[];
  pendingDrivers: {
    userId: string;
    fullName: string;
    phone: string;
    createdAt: string;
  }[];
  pendingProperties: {
    id: string;
    name: string;
    type: PropertyType;
    createdAt: string;
    ownerName: string;
  }[];
}

export interface AdminUser {
  id: string;
  fullName: string;
  email: string | null;
  phone: string;
  role: Role;
  status: string;
  phoneVerified: boolean;
  createdAt: string;
  universityShortName: string | null;
  driverVerificationStatus: string | null;
  driverStatus: string | null;
}

export interface AdminDriver {
  userId: string;
  fullName: string;
  phone: string;
  email: string | null;
  status: 'IDLE' | 'ON_ROAD' | 'OFFLINE' | 'REQUESTED';
  verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
  rejectionReason: string | null;
  universityShortName: string;
  licenseNumber: string | null;
  licenseExpiry: string | null;
  nationalId: string | null;
  ratingAvg: number;
  completedRides: number;
  plateNumber: string | null;
  make: string | null;
  model: string | null;
  vehicleType: string | null;
  insuranceExpiry: string | null;
  createdAt: string;
  documents: { id: string; type: string; fileUrl: string; status: string }[] | null;
}

export interface AdminProperty {
  id: string;
  name: string;
  type: PropertyType;
  description: string;
  addressArea: string;
  priceFrom: number;
  status: string;
  verifiedAt: string | null;
  createdAt: string;
  ownerName: string;
  ownerPhone: string;
  universityShortName: string;
  imageUrl: string | null;
  units: number;
}

export interface Complaint {
  id: string;
  complainantName?: string;
  accusedName?: string | null;
  subject: string;
  description: string;
  status: 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'DISMISSED';
  resolution: string | null;
  createdAt: string;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  status: 'NEW' | 'READ' | 'ARCHIVED';
  createdAt: string;
}

export interface AdminLog {
  id: string;
  adminId: string;
  adminName: string;
  action: string;
  entityType: string;
  entityId: string;
  details: Record<string, unknown>;
  createdAt: string;
}

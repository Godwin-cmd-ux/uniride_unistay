-- UNIRIDE UNISTAY — PostgreSQL schema
-- Safe to re-run: every statement is idempotent.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- Universities & service zones
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS universities (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name               text NOT NULL,
  short_name         text NOT NULL UNIQUE,
  city               text NOT NULL,
  region             text NOT NULL,
  latitude           double precision NOT NULL,
  longitude          double precision NOT NULL,
  driver_radius_km   integer NOT NULL DEFAULT 5,
  property_radius_km integer NOT NULL DEFAULT 10,
  status             text NOT NULL DEFAULT 'ACTIVE'
                     CHECK (status IN ('ACTIVE', 'INACTIVE')),
  created_at         timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Users, profiles & auth
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name      text NOT NULL,
  email          text UNIQUE,
  phone          text NOT NULL UNIQUE,
  password_hash  text,
  role           text NOT NULL CHECK (role IN ('STUDENT', 'DRIVER', 'OWNER', 'ADMIN')),
  status         text NOT NULL DEFAULT 'ACTIVE'
                 CHECK (status IN ('ACTIVE', 'SUSPENDED', 'PENDING')),
  phone_verified boolean NOT NULL DEFAULT false,
  university_id  uuid REFERENCES universities(id) ON DELETE SET NULL,
  avatar_url     text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS users_role_idx ON users(role);

CREATE TABLE IF NOT EXISTS phone_otps (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone       text NOT NULL,
  code_hash   text NOT NULL,
  purpose     text NOT NULL DEFAULT 'REGISTER'
              CHECK (purpose IN ('REGISTER', 'LOGIN')),
  attempts    integer NOT NULL DEFAULT 0,
  expires_at  timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS phone_otps_phone_idx ON phone_otps(phone, created_at DESC);

CREATE TABLE IF NOT EXISTS student_profiles (
  user_id          uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  student_id_number text,
  university_id    uuid REFERENCES universities(id) ON DELETE SET NULL,
  verified_at      timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS driver_profiles (
  user_id            uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  university_id      uuid NOT NULL REFERENCES universities(id) ON DELETE RESTRICT,
  license_number     text,
  license_expiry     date,
  national_id        text,
  status             text NOT NULL DEFAULT 'OFFLINE'
                     CHECK (status IN ('IDLE', 'ON_ROAD', 'OFFLINE', 'REQUESTED')),
  verification_status text NOT NULL DEFAULT 'PENDING'
                     CHECK (verification_status IN ('PENDING', 'VERIFIED', 'REJECTED')),
  rejection_reason   text,
  current_lat        double precision,
  current_lng        double precision,
  last_heartbeat_at  timestamptz,
  rating_avg         numeric(3,2) NOT NULL DEFAULT 5.00,
  rating_count       integer NOT NULL DEFAULT 0,
  total_earnings     numeric(12,2) NOT NULL DEFAULT 0,
  completed_rides    integer NOT NULL DEFAULT 0,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS driver_profiles_discovery_idx
  ON driver_profiles(university_id, status, verification_status);

CREATE TABLE IF NOT EXISTS vehicles (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id          uuid NOT NULL UNIQUE REFERENCES driver_profiles(user_id) ON DELETE CASCADE,
  plate_number       text NOT NULL UNIQUE,
  make               text,
  model              text,
  year               integer,
  type               text NOT NULL DEFAULT 'MOTORCYCLE'
                     CHECK (type IN ('MOTORCYCLE', 'CAR')),
  tracking_device_id text,
  insurance_expiry   date,
  verified_at        timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Properties & bookable inventory
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS properties (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id      uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  university_id uuid NOT NULL REFERENCES universities(id) ON DELETE RESTRICT,
  type          text NOT NULL CHECK (type IN ('HOSTEL', 'HOUSE', 'APARTMENT', 'ROOM')),
  name          text NOT NULL,
  description   text NOT NULL DEFAULT '',
  address_area  text NOT NULL,
  latitude      double precision,
  longitude     double precision,
  price_from    numeric(12,2) NOT NULL DEFAULT 0,
  amenities     jsonb NOT NULL DEFAULT '[]'::jsonb,
  status        text NOT NULL DEFAULT 'PENDING'
                CHECK (status IN ('PENDING', 'ACTIVE', 'REJECTED', 'SUSPENDED', 'ARCHIVED')),
  verified_at   timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS properties_listing_idx ON properties(university_id, status, type);
CREATE INDEX IF NOT EXISTS properties_owner_idx ON properties(owner_id);

CREATE TABLE IF NOT EXISTS property_images (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  url         text NOT NULL,
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rooms (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id      uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  name             text NOT NULL,
  capacity         integer NOT NULL DEFAULT 1,
  price_per_month  numeric(12,2) NOT NULL,
  has_beds         boolean NOT NULL DEFAULT false,
  status           text NOT NULL DEFAULT 'AVAILABLE'
                   CHECK (status IN ('AVAILABLE', 'INACTIVE')),
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS beds (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id         uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  label           text NOT NULL,
  price_per_month numeric(12,2) NOT NULL,
  status          text NOT NULL DEFAULT 'AVAILABLE'
                  CHECK (status IN ('AVAILABLE', 'INACTIVE')),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bookable_units (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id     uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  room_id         uuid REFERENCES rooms(id) ON DELETE CASCADE,
  bed_id          uuid REFERENCES beds(id) ON DELETE CASCADE,
  label           text NOT NULL,
  price_per_month numeric(12,2) NOT NULL,
  status          text NOT NULL DEFAULT 'AVAILABLE'
                  CHECK (status IN ('AVAILABLE', 'OCCUPIED', 'INACTIVE')),
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS bookable_units_property_idx ON bookable_units(property_id, status);

-- ---------------------------------------------------------------------------
-- UNIRIDE bookings
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ride_bookings (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id       uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  university_id    uuid NOT NULL REFERENCES universities(id) ON DELETE RESTRICT,
  driver_id        uuid REFERENCES users(id) ON DELETE SET NULL,
  vehicle_id       uuid REFERENCES vehicles(id) ON DELETE SET NULL,
  pickup_label     text NOT NULL,
  pickup_lat       double precision,
  pickup_lng       double precision,
  dest_label       text NOT NULL,
  dest_lat         double precision,
  dest_lng         double precision,
  distance_m       integer NOT NULL DEFAULT 0,
  estimated_fare   numeric(12,2) NOT NULL,
  final_fare       numeric(12,2),
  commission_rate  numeric(5,4) NOT NULL DEFAULT 0.12,
  commission_amount numeric(12,2),
  driver_earnings  numeric(12,2),
  status           text NOT NULL DEFAULT 'REQUESTED'
                   CHECK (status IN ('REQUESTED', 'ACCEPTED', 'DRIVER_EN_ROUTE', 'ON_TRIP', 'COMPLETED', 'CANCELLED')),
  cancelled_by     uuid REFERENCES users(id) ON DELETE SET NULL,
  cancellation_reason text,
  requested_at     timestamptz NOT NULL DEFAULT now(),
  accepted_at      timestamptz,
  started_at       timestamptz,
  completed_at     timestamptz,
  cancelled_at     timestamptz
);
CREATE INDEX IF NOT EXISTS ride_student_idx ON ride_bookings(student_id, requested_at DESC);
CREATE INDEX IF NOT EXISTS ride_driver_idx ON ride_bookings(driver_id, requested_at DESC);
CREATE INDEX IF NOT EXISTS ride_open_idx ON ride_bookings(university_id, status);

-- ---------------------------------------------------------------------------
-- UNISTAY inquiries & bookings
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS accommodation_inquiries (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id       uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  property_id      uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  bookable_unit_id uuid NOT NULL REFERENCES bookable_units(id) ON DELETE RESTRICT,
  move_in_date     date NOT NULL,
  duration_months  integer NOT NULL CHECK (duration_months BETWEEN 1 AND 36),
  message          text NOT NULL DEFAULT '',
  status           text NOT NULL DEFAULT 'PENDING'
                   CHECK (status IN ('PENDING', 'ACCEPTED', 'DECLINED', 'WITHDRAWN')),
  response_message text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  responded_at     timestamptz
);
CREATE INDEX IF NOT EXISTS inquiry_student_idx ON accommodation_inquiries(student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS inquiry_property_idx ON accommodation_inquiries(property_id, status);

CREATE TABLE IF NOT EXISTS accommodation_bookings (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id       uuid NOT NULL UNIQUE REFERENCES accommodation_inquiries(id) ON DELETE RESTRICT,
  student_id       uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  property_id      uuid NOT NULL REFERENCES properties(id) ON DELETE RESTRICT,
  bookable_unit_id uuid NOT NULL REFERENCES bookable_units(id) ON DELETE RESTRICT,
  start_date       date NOT NULL,
  end_date         date NOT NULL,
  monthly_rent     numeric(12,2) NOT NULL,
  total_amount     numeric(12,2) NOT NULL,
  success_fee      numeric(12,2) NOT NULL DEFAULT 0,
  status           text NOT NULL DEFAULT 'ACTIVE'
                   CHECK (status IN ('ACTIVE', 'COMPLETED', 'CANCELLED')),
  confirmed_at     timestamptz NOT NULL DEFAULT now(),
  ended_at         timestamptz
);
CREATE INDEX IF NOT EXISTS accommodation_booking_unit_idx ON accommodation_bookings(bookable_unit_id, status);

-- ---------------------------------------------------------------------------
-- Transactions, reviews, notifications, complaints, verification, admin
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS transactions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid REFERENCES users(id) ON DELETE SET NULL,
  type         text NOT NULL CHECK (type IN ('RIDE_FARE', 'RIDE_COMMISSION', 'DRIVER_EARNING', 'ACCOMMODATION_FEE')),
  booking_type text NOT NULL CHECK (booking_type IN ('RIDE', 'ACCOMMODATION')),
  booking_id   uuid NOT NULL,
  amount       numeric(12,2) NOT NULL,
  currency     text NOT NULL DEFAULT 'TZS',
  provider     text NOT NULL DEFAULT 'CASH',
  reference    text,
  status       text NOT NULL DEFAULT 'RECORDED',
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS transactions_booking_idx ON transactions(booking_type, booking_id);

CREATE TABLE IF NOT EXISTS reviews (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_id  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reviewee_id  uuid REFERENCES users(id) ON DELETE SET NULL,
  booking_type text NOT NULL CHECK (booking_type IN ('RIDE', 'ACCOMMODATION')),
  booking_id   uuid NOT NULL,
  rating       integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment      text NOT NULL DEFAULT '',
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (reviewer_id, booking_type, booking_id)
);
CREATE INDEX IF NOT EXISTS reviews_reviewee_idx ON reviews(reviewee_id);

CREATE TABLE IF NOT EXISTS notifications (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       text NOT NULL,
  title      text NOT NULL,
  body       text NOT NULL,
  data       jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at    timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS complaints (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  complainant_id   uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  against_user_id  uuid REFERENCES users(id) ON DELETE SET NULL,
  booking_type     text CHECK (booking_type IN ('RIDE', 'ACCOMMODATION')),
  booking_id       uuid,
  subject          text NOT NULL,
  description      text NOT NULL,
  status           text NOT NULL DEFAULT 'OPEN'
                   CHECK (status IN ('OPEN', 'IN_REVIEW', 'RESOLVED', 'DISMISSED')),
  resolution       text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS complaints_status_idx ON complaints(status, created_at DESC);

CREATE TABLE IF NOT EXISTS verification_documents (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        text NOT NULL CHECK (type IN ('LICENSE', 'NATIONAL_ID', 'VEHICLE_INSURANCE', 'TITLE_DEED', 'STUDENT_ID')),
  file_url    text NOT NULL,
  status      text NOT NULL DEFAULT 'PENDING'
              CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  verified_by uuid REFERENCES users(id) ON DELETE SET NULL,
  verified_at timestamptz,
  expires_at  date,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS verification_documents_user_idx ON verification_documents(user_id);

CREATE TABLE IF NOT EXISTS admin_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id    uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  action      text NOT NULL,
  entity_type text NOT NULL,
  entity_id   text NOT NULL,
  details     jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS admin_logs_created_idx ON admin_logs(created_at DESC);

CREATE TABLE IF NOT EXISTS contact_messages (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  email      text NOT NULL,
  phone      text,
  subject    text NOT NULL,
  message    text NOT NULL,
  status     text NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW', 'READ', 'ARCHIVED')),
  created_at timestamptz NOT NULL DEFAULT now()
);

# Payment Modules Documentation

This documentation covers the Payment Method and Payout modules implementation for the jdadzok_server project.

## Overview

The payment system is organized into two main modules:
- **Payment Methods**: Manages user payment methods (credit cards, PayPal, etc.)
- **Payouts**: Handles payout requests and processing

## Table of Contents

1. [Architecture](#architecture)
2. [Payment Methods Module](#payment-methods-module)
3. [Payout Module](#payout-module)
4. [API Endpoints](#api-endpoints)
5. [Database Schema](#database-schema)
6. [Security Features](#security-features)
7. [Business Rules](#business-rules)
8. [Usage Examples](#usage-examples)

## Architecture

```
(pay)/
├── payment-methods/
│   ├── dto/
│   │   └── payment-method.dto.ts
│   ├── payment-method.controller.ts
│   ├── payment-method.service.ts
│   ├── payment-method.repository.ts
│   └── payment.method.module.ts
├── payout/
│   ├── dto/
│   │   └── payout.dto.ts
│   ├── payout.controller.ts
│   ├── payout.service.ts
│   ├── payout.repository.ts
│   └── payout.module.ts
├── pay.group.module.ts
└── README.md
```

## Payment Methods Module

### Purpose
Manages user payment methods including credit cards and digital payment platforms.

### Key Features
- CRUD operations for payment methods
- Default payment method management
- Card number masking for security
- User ownership validation
- Maximum 5 payment methods per user

### DTOs

#### CreatePaymentMethodDto
```typescript
{
  method: PaymentMethod;        // STRIPE | PAYPAL
  cardHolder: string;          // Card holder name
  cardNumber: string;          // Card number (will be encrypted)
  expireMonth: string;         // MM format
  expireYear: string;          // YYYY format
  CVC: string;                 // Security code (not stored)
  isDefault?: boolean;         // Set as default method
}
```

#### PaymentMethodResponseDto
```typescript
{
  id: string;
  userId: string;
  method: PaymentMethod;
  cardHolder: string;
  cardNumber: string;          // Encrypted in DB
  maskedCardNumber: string;    // **** **** **** 1234
  expireMonth: string;
  expireYear: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### API Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/payment-methods` | Create payment method | ✓ |
| GET | `/payment-methods` | Get user's payment methods | ✓ |
| GET | `/payment-methods/all` | Get all payment methods (admin) | ✓ |
| GET | `/payment-methods/default` | Get default payment method | ✓ |
| GET | `/payment-methods/:id` | Get payment method by ID | ✓ |
| PUT | `/payment-methods/:id` | Update payment method | ✓ |
| PUT | `/payment-methods/:id/set-default` | Set as default | ✓ |
| DELETE | `/payment-methods/:id` | Delete payment method | ✓ |

## Payout Module

### Purpose
Handles payout requests, processing, and tracking for users.

### Key Features
- Payout request management
- Status tracking (PENDING, PAID)
- Payment processor integration support
- Statistics and reporting
- Admin processing capabilities

### DTOs

#### CreatePayoutDto
```typescript
{
  amount: number;              // Amount to pay out (min $5.00)
  method: PaymentMethod;       // STRIPE | PAYPAL
  userId?: string;             // Optional for admin use
}
```

#### PayoutResponseDto
```typescript
{
  id: string;
  userId: string;
  amount: number;
  method: PaymentMethod;
  status: PayOutStatus;        // PENDING | PAID
  transactionId: string | null;
  processorFee: number | null;
  netAmount: number;           // amount - processorFee
  createdAt: Date;
  updatedAt: Date;
}
```

#### PayoutStatsDto
```typescript
{
  totalAmount: number;
  totalCount: number;
  pendingAmount: number;
  pendingCount: number;
  paidAmount: number;
  paidCount: number;
  totalFees: number;
}
```

### API Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/payouts` | Create payout request | ✓ |
| GET | `/payouts` | Get user's payouts | ✓ |
| GET | `/payouts/all` | Get all payouts (admin) | ✓ |
| GET | `/payouts/pending` | Get pending payouts (admin) | ✓ |
| GET | `/payouts/stats` | Get user payout stats | ✓ |
| GET | `/payouts/stats/all` | Get overall stats (admin) | ✓ |
| GET | `/payouts/summary` | Get user payout summary | ✓ |
| GET | `/payouts/status/:status` | Get payouts by status | ✓ |
| GET | `/payouts/count` | Count payouts with filters | ✓ |
| GET | `/payouts/:id` | Get payout by ID | ✓ |
| PUT | `/payouts/:id` | Update payout request | ✓ |
| PUT | `/payouts/:id/process` | Process payout (admin) | ✓ |
| PUT | `/payouts/:id/status` | Update status (admin) | ✓ |
| DELETE | `/payouts/:id` | Delete payout request | ✓ |
| POST | `/payouts/validate-amount` | Validate payout amount | ✓ |

## Database Schema

### PaymentMethods Table
```sql
CREATE TABLE "payment-methods" (
  id              VARCHAR PRIMARY KEY DEFAULT uuid(),
  userId          VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  method          PaymentMethod NOT NULL,
  cardHolder      VARCHAR NOT NULL,
  cardNumber      VARCHAR NOT NULL,  -- Should be encrypted
  expireMonth     VARCHAR NOT NULL,
  expireYear      VARCHAR NOT NULL,
  CVC             VARCHAR NOT NULL,  -- Should NOT be stored in production
  isDefault       BOOLEAN DEFAULT false,
  createdAt       TIMESTAMP DEFAULT now(),
  updatedAt       TIMESTAMP DEFAULT now()
);

-- Indexes
CREATE INDEX idx_payment_methods_user_id ON "payment-methods"(userId);
CREATE INDEX idx_payment_methods_method ON "payment-methods"(method);
CREATE INDEX idx_payment_methods_created_at ON "payment-methods"(createdAt);
```

### Payouts Table
```sql
CREATE TABLE payouts (
  id              VARCHAR PRIMARY KEY DEFAULT uuid(),
  userId          VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount          DECIMAL(10,2) NOT NULL,
  method          PaymentMethod NOT NULL,
  status          PayOutStatus DEFAULT 'PENDING',
  transactionId   VARCHAR,
  processorFee    DECIMAL(10,2),
  createdAt       TIMESTAMP DEFAULT now(),
  updatedAt       TIMESTAMP DEFAULT now()
);

-- Indexes
CREATE INDEX idx_payouts_user_id ON payouts(userId);
CREATE INDEX idx_payouts_status ON payouts(status);
CREATE INDEX idx_payouts_created_at ON payouts(createdAt);
```

### Enums
```sql
CREATE TYPE PaymentMethod AS ENUM ('STRIPE', 'PAYPAL');
CREATE TYPE PayOutStatus AS ENUM ('PENDING', 'PAID');
```

## Security Features

### Authentication & Authorization
- JWT authentication required for all endpoints
- User ownership validation for all operations
- Admin-specific endpoints separated

### Data Protection
- CVC codes are never stored in the database
- Card numbers should be encrypted/tokenized in production
- Masked card numbers for display (**** **** **** 1234)
- Input validation on all DTOs

### API Security
- Rate limiting should be implemented
- HTTPS only in production
- Input sanitization
- SQL injection protection via Prisma ORM

## Business Rules

### Payment Methods
- Maximum 5 payment methods per user
- First payment method automatically set as default
- Only one default payment method per user
- Card number validation (13-19 digits)

### Payouts
- Minimum payout amount: $5.00
- Maximum pending amount per user: $1000.00
- Only pending payouts can be modified/deleted
- Automatic status transitions (PENDING → PAID)

### Processing Rules
- Payouts processed in FIFO order (oldest first)
- Transaction ID required for processing
- Processor fees tracked separately
- Net amount calculated automatically

## Usage Examples

### Creating a Payment Method
```typescript
// POST /payment-methods
{
  "method": "STRIPE",
  "cardHolder": "John Doe",
  "cardNumber": "4111111111111111",
  "expireMonth": "12",
  "expireYear": "2025",
  "CVC": "123",
  "isDefault": true
}
```

### Creating a Payout Request
```typescript
// POST /payouts
{
  "amount": 50.00,
  "method": "STRIPE"
}
```

### Processing a Payout (Admin)
```typescript
// PUT /payouts/:id/process
{
  "transactionId": "tx_abc123",
  "processorFee": 1.50
}
```

### Querying Payouts with Filters
```typescript
// GET /payouts/all?status=PENDING&minAmount=10&limit=50
```

## Error Handling

### Common Error Codes
- `400 Bad Request`: Invalid input data
- `401 Unauthorized`: Missing or invalid JWT token
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `409 Conflict`: Business rule violation

### Example Error Response
```json
{
  "statusCode": 400,
  "message": "Minimum payout amount is $5.00",
  "error": "Bad Request"
}
```

## Development Notes

### Testing
- Unit tests should cover all service methods
- Integration tests for API endpoints
- Mock payment processor responses
- Test edge cases (minimum amounts, limits)

### Performance Considerations
- Database indexes on frequently queried fields
- Pagination for large result sets
- Caching for statistics queries
- Async processing for heavy operations

### Future Enhancements
- Additional payment methods (Bitcoin, Apple Pay)
- Recurring payout schedules
- Payment method verification
- Transaction history tracking
- Webhook support for payment processors

## Support

For questions or issues with the payment modules, please:
1. Check this documentation
2. Review the code comments
3. Run the test suite
4. Contact the development team

---

*Last updated: 2025-09-09*

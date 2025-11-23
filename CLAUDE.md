# CLAUDE.md - FreelanceAcc Development Guide for AI Assistants

## Project Overview

**FreelanceAcc** (ระบบบัญชีสำหรับฟรีแลนซ์) is a Thai-focused accounting system designed specifically for freelancers and small businesses. The application helps users manage quotations, invoices, receipts, tax documents, transactions, and Thai tax filing requirements.

**Key Features:**
- Multi-account support (freelance and company account types)
- Document generation (quotations, invoices, receipts, tax invoices/receipts)
- Transaction tracking (income and expenses)
- Withholding tax (WHT) tracking for freelancers
- Thai personal income tax calculation and filing assistance
- Customer management
- Financial dashboards and reporting
- Export capabilities (CSV, Excel)

## Technology Stack

### Core Technologies
- **Frontend Framework:** React 18.3.1 with TypeScript (~5.8.2)
- **Build Tool:** Vite 6.2.0
- **Routing:** React Router DOM 6.22.3
- **Backend/Database:** Supabase (PostgreSQL with real-time capabilities)
- **Authentication:** Supabase Auth
- **State Management:** React Context API (AuthContext, AccountContext)

### Key Dependencies
- **UI/Icons:** lucide-react 0.344.0
- **Charts:** recharts 2.12.3
- **Excel Export:** xlsx (latest)
- **Firebase:** 12.6.0 (possibly for analytics or notifications)
- **Supabase Client:** @supabase/supabase-js 2.39.3

### Development Tools
- TypeScript with ES2022 target
- Path aliases: `@/*` maps to project root
- Module system: ESNext with bundler resolution
- JSX: react-jsx transform

## Project Structure

The project uses a **flat directory structure** (no `src/` folder). Files are organized at the root level:

```
/FreelanceAcc
├── App.tsx                 # Main application component with routing
├── index.tsx              # Application entry point
├── index.html             # HTML template
├── types.ts               # Global TypeScript type definitions
├── vite.config.ts         # Vite configuration
├── tsconfig.json          # TypeScript configuration
├── package.json           # Dependencies and scripts
├── metadata.json          # Project metadata
├── /components            # Reusable UI components
│   ├── AccountSwitcher.tsx
│   ├── Navbar.tsx
│   └── NotificationBell.tsx
├── /context               # React Context providers
│   ├── AuthContext.tsx    # User authentication state
│   └── AccountContext.tsx # Account selection state
├── /pages                 # Page components (15 pages, ~5600 LOC total)
│   ├── LandingPage.tsx
│   ├── LoginPage.tsx
│   ├── DashboardPage.tsx
│   ├── SelectAccountPage.tsx
│   ├── CustomersPage.tsx
│   ├── DocumentsPage.tsx
│   ├── DocumentFormPage.tsx (largest: ~53K)
│   ├── QuotationsPage.tsx
│   ├── QuotationFormPage.tsx
│   ├── TransactionsPage.tsx
│   ├── WhtPage.tsx
│   ├── TaxPage.tsx
│   ├── TaxFilingPage.tsx (large: ~71K)
│   ├── SettingsPage.tsx
│   └── AuthCallbackPage.tsx
├── /services              # Business logic and API integration
│   ├── supabase.ts        # Supabase client configuration
│   ├── firebase.ts        # Firebase configuration
│   ├── accountService.ts
│   ├── customerService.ts
│   ├── documentService.ts
│   ├── quotationService.ts
│   ├── transactionService.ts
│   ├── taxService.ts
│   ├── reportService.ts
│   ├── notificationService.ts
│   └── settingService.ts
└── /utils                 # Utility functions
    └── currency.ts        # Currency formatting utilities
```

## Architecture Patterns

### 1. Service Layer Pattern

All database interactions and business logic are abstracted into service modules in `/services`. Each service:
- Handles Supabase queries
- Maps between database schema and TypeScript types
- Provides CRUD operations
- Handles error logging
- Returns typed data

**Example Pattern:**
```typescript
// services/[entity]Service.ts
const TABLE_NAME = 'table_name';

export const getEntities = async (userId: string): Promise<Entity[]> => {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('user_id', userId);

  if (error) throw error;
  return data.map(mapFromDB);
};
```

### 2. Context-Based State Management

Two main contexts manage global application state:

**AuthContext** (`context/AuthContext.tsx`):
- User authentication state
- Login/register/logout methods
- Supabase session management
- User profile mapping

**AccountContext** (`context/AccountContext.tsx`):
- Multi-account support
- Current account selection
- Account switching
- Persists selection in localStorage (key: `selected_account_${userId}`)

### 3. Protected Routes

All authenticated routes use the `ProtectedRoute` component (defined in App.tsx):
- Checks authentication status
- Verifies account selection (when `requireAccount={true}`)
- Redirects to login or account selection as needed
- Shows loading state during checks

### 4. Type Safety

**Centralized Types** (`types.ts`):
- All interfaces and types are defined in a single file
- Database field names use snake_case
- Application code uses camelCase
- Services handle mapping between conventions

**Key Types:**
- `UserProfile` - Authenticated user
- `Account` (alias: `SellerProfile`) - Business account
- `Customer` - Customer records
- `AppDocument` (alias: `Quotation`) - Multi-type documents
- `Transaction` - Income/expense records
- `Notification` - System notifications

### 5. Database Schema Mapping

**Important:** Database uses **snake_case** columns, application uses **camelCase**:

```typescript
// Database: account_type, business_name, tax_id, created_at
// TypeScript: type, name, taxId, createdAt

// Services handle mapping:
type: item.account_type,
name: item.business_name,
taxId: item.tax_id,
createdAt: new Date(item.created_at)
```

## Supabase Database Schema

### Core Tables

**accounts**
- `id` (uuid, primary key)
- `user_id` (text, foreign key to auth.users)
- `account_type` ('company' | 'freelance')
- `business_name` (text)
- `tax_id` (text)
- `address`, `phone`, `email` (text)
- `created_at`, `updated_at` (timestamp)

**customers**
- `id` (uuid, primary key)
- `user_id` (text)
- `account_id` (uuid, foreign key)
- `name`, `taxId`, `address`, `phone`, `email`
- `created_at` (timestamp)

**documents**
- `id` (uuid, primary key)
- `type` ('quotation' | 'invoice' | 'receipt' | 'tax_invoice' | 'tax_receipt')
- `document_no` (text, e.g., "QT-2025-001")
- `reference_no`, `reference_id` (text, for linked documents)
- `project_name` (text)
- `user_id`, `account_id`, `customer_id` (foreign keys)
- `customer_name`, `customer_address`, `customer_tax_id`
- `issue_date`, `due_date`, `paid_date` (timestamp)
- `items` (jsonb array of QuotationItem)
- `subtotal`, `vat_rate`, `vat_amount`, `grand_total` (numeric)
- `withholding_tax_rate` (numeric)
- `wht_received` (boolean), `wht_received_date` (timestamp)
- `notes` (text)
- `status` ('draft' | 'sent' | 'accepted' | 'rejected' | 'paid' | 'overdue')
- `created_at`, `updated_at` (timestamp)

**transactions**
- `id` (uuid, primary key)
- `account_id` (uuid, foreign key)
- `type` ('income' | 'expense')
- `date` (timestamp)
- `amount` (numeric)
- `category` (text, see EXPENSE_CATEGORIES and INCOME_CATEGORIES in types.ts)
- `description` (text)
- `created_at` (timestamp)
- Note: `reference_no`, `attachment_url`, and `user_id` fields are commented out in service layer due to schema differences

**notifications**
- `id` (uuid, primary key)
- `user_id` (text)
- `account_id` (uuid)
- `title`, `message` (text)
- `type` ('info' | 'warning' | 'error' | 'success')
- `is_read` (boolean)
- `created_at` (timestamp)
- `related_doc_id`, `related_doc_no` (text)
- `trigger_key` (text, for deduplication)

### Row Level Security (RLS)

Supabase is configured with RLS policies. All queries filter by:
- `user_id` matches authenticated user
- `account_id` matches current selected account

## Key Development Conventions

### 1. Document Number Generation

Documents use auto-generated sequential numbers per type and year:
- Pattern: `{PREFIX}-{YEAR}-{SEQUENCE}`
- Examples: `QT-2025-001`, `INV-2025-042`, `RC-2025-015`
- Prefixes defined in `documentService.ts:getPrefix()`
- Sequence is 3-digit, padded with zeros

### 2. Multi-Account Architecture

Users can have multiple accounts (freelance/company):
1. After login, check if accounts exist
2. If multiple accounts, redirect to `/select-account`
3. Selected account ID stored in localStorage
4. All data operations scoped to `currentAccount.id`
5. Account switcher available in Navbar

### 3. Thai Language Support

- UI labels are in Thai
- Categories use Thai names (see `EXPENSE_CATEGORIES`, `INCOME_CATEGORIES` in types.ts)
- Date formatting uses `th-TH` locale
- Currency formatting uses Thai Baht (฿)

### 4. Print-Friendly Documents

Document pages include print styles:
- CSS classes: `print:hidden`, `print:block`, `print:p-0`
- Navbar/footer hidden in print
- Full-width layout for documents

### 5. Error Handling Pattern

Services follow this pattern:
```typescript
try {
  const { data, error } = await supabase.from(TABLE_NAME)...
  if (error) throw error;
  return processData(data);
} catch (error: any) {
  console.error("Error description:", error);
  // Either throw or return empty array/default value
  throw new Error(error?.message || JSON.stringify(error));
}
```

### 6. Date Handling

- Database stores ISO 8601 timestamps
- Application uses JavaScript `Date` objects
- Services convert: `new Date(item.created_at)`
- Forms may use date inputs with `.toISOString()` or locale formatting

### 7. Schema Compatibility Notes

Recent commits show schema adjustments:
- Some fields commented out in services to match actual database schema
- Check service files for comments like `// Commented out to fix schema error`
- Always verify field availability before using in services

## Common Development Tasks

### Adding a New Page

1. Create page component in `/pages/[PageName].tsx`
2. Add route in `App.tsx` `<Routes>` section
3. Wrap with `<ProtectedRoute>` if authentication required
4. Add navigation link in `Navbar.tsx` if needed
5. Consider account context requirements

### Adding a New Service

1. Create `/services/[entity]Service.ts`
2. Define `TABLE_NAME` constant
3. Import type from `types.ts`
4. Implement CRUD operations with Supabase
5. Add field mapping between snake_case and camelCase
6. Include error handling

### Modifying Database Schema

1. Make changes in Supabase dashboard
2. Update type definitions in `types.ts`
3. Update service layer mappings in relevant service file
4. Test all affected CRUD operations
5. Consider RLS policy implications

### Adding a New Document Type

1. Add type to `DocumentType` union in `types.ts`
2. Add prefix in `documentService.ts:getPrefix()`
3. Create route in `App.tsx` using `DocumentsPage` and `DocumentFormPage`
4. Add navigation in `Navbar.tsx`
5. Consider conditional rendering based on account type

## Build and Development

### Available Scripts

```bash
npm run dev      # Start dev server on http://localhost:3000
npm run build    # Production build
npm run preview  # Preview production build
```

### Environment Variables

The app uses environment variables for API keys:
- `GEMINI_API_KEY` - Set in `.env.local` (for AI features)
- Supabase credentials are currently hardcoded in `services/supabase.ts`

**Note:** For production, move Supabase credentials to environment variables.

### Dev Server Configuration

- Port: 3000
- Host: 0.0.0.0 (accessible from network)
- Hot Module Replacement (HMR) enabled

## Testing Considerations

Currently no test suite is configured. When adding tests:
- Consider Jest + React Testing Library
- Test service layer independently (mock Supabase)
- Test context providers with different states
- Test protected routes and redirects
- Test form validation and submissions

## Important Notes for AI Assistants

### 1. Schema Awareness

**Always check the service layer before modifying database operations.** Recent commits show schema mismatches. Some fields in TypeScript types may not exist in the actual database schema:
- `transactions.reference_no` - commented out
- `transactions.attachment_url` - commented out
- `transactions.user_id` - commented out in insert operations

### 2. camelCase vs snake_case

**Critical:** When working with Supabase:
- Database columns: `user_id`, `account_id`, `created_at`, `business_name`
- TypeScript: `userId`, `accountId`, `createdAt`, `name`
- Always use service layer mappings, never access Supabase directly from components

### 3. Account Context Requirement

Most operations require an account to be selected:
```typescript
const { currentAccount } = useAccount();
if (!currentAccount) return; // Handle no account case
```

### 4. File Size Awareness

Some page files are very large:
- `DocumentFormPage.tsx`: 53KB (complex form logic)
- `TaxFilingPage.tsx`: 71KB (extensive tax calculations)

When modifying these, consider:
- Breaking into smaller components
- Extracting business logic to utils
- Avoiding unnecessary re-renders

### 5. Recent Fixes

Recent commits reference:
- Supabase schema errors (fixed by commenting out fields)
- Notification service adjustments for schema changes
- Dependency updates

Always verify current schema state when modifying data operations.

### 6. Notification System

The notification service uses:
- `trigger_key` for deduplication
- Account-scoped notifications
- Real-time updates capability (Supabase subscriptions possible)
- Links to related documents via `related_doc_id`

### 7. Tax Functionality

Special considerations for Thai tax system:
- WHT tracking for freelancers (3% or 5% typically)
- VAT calculation (7% standard rate)
- Personal income tax calculation using Thai brackets
- Half-year and full-year expense tracking
- Form downloads and guides

### 8. Security Considerations

- Supabase credentials exposed in code (should be env vars)
- RLS policies protect data at database level
- Authentication required for most routes
- Account-based data isolation

## Git Workflow

The project uses a branch-based workflow:
- Development on feature branches: `claude/claude-md-[session-id]`
- Commit messages reference changes (e.g., "fix: Resolve Supabase schema errors")
- Push to origin with `-u` flag for new branches

## Future Improvements

Consider suggesting:
1. Move Supabase credentials to environment variables
2. Add comprehensive test coverage
3. Extract large page components into smaller modules
4. Add TypeScript strict mode
5. Implement proper error boundaries
6. Add loading states and skeleton screens
7. Optimize bundle size (code splitting)
8. Add database migrations management
9. Implement audit logs
10. Add data export/import functionality

## Quick Reference

### Most Modified Files
- `/pages/DocumentFormPage.tsx` - Main document creation/editing
- `/pages/TaxFilingPage.tsx` - Tax filing assistant
- `/services/documentService.ts` - Document business logic
- `/App.tsx` - Routing and protected routes

### Key Entry Points
- User lands on `/` (LandingPage)
- Login at `/login`
- After auth, redirect to `/select-account` (if multiple) or `/dashboard`
- Main navigation via Navbar component

### Critical Dependencies
- `useAuth()` - Get current user
- `useAccount()` - Get current account
- Services in `/services/*` - All data operations
- Types in `types.ts` - Type safety

---

**Last Updated:** 2025-11-23
**Version:** Based on commit 39907bd and current codebase state

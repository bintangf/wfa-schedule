# 📅 WFA Calendar - Work From Anywhere Schedule Manager

A modern web application for managing team Work From Anywhere (WFA) schedules with automatic A/B/C/D rotation, Indonesian public holiday integration, and leave management.

## 🚀 Features

### 📊 WFA Schedule Management
- **Automatic A→B→C→D rotation** for working days (Monday-Friday)
- **Smart holiday handling** - schedules shift when holidays occur (not overridden)
- **Weekend awareness** - Saturdays and Sundays are properly highlighted and excluded from work rotation
- **Calendar grid** with full week view including previous/next month dates

### 🇮🇩 Indonesian Holiday Integration
- **API integration** for comprehensive holiday data from `grei.pythonanywhere.com`
- **Manual holiday management** by administrators
- **Automatic deduplication** of holidays

### 👥 Leave Management
- **Range-based leave requests** - single day or multiple days including weekends
- **Initials-based tracking** (max 3 characters)
- **IPv4 IP tracking** for security and edit permissions
- **Search functionality** - find leaves by employee initials
- **IP-based editing** - users can only edit/delete their own leaves (same IP)
- **Admin override** - administrators can manage any leave

### 🎨 Modern UI/UX
- **Responsive design** - works on desktop and mobile
- **Dark/Light theme** toggle
- **Today button** for quick navigation
- **Weekend highlighting** with special styling
- **Color-coded WFA badges** (A/B/C/D)
- **Leave indicators** displayed compactly on calendar
- **Two-column layout** - calendar on left, info panel on right

### 🔐 Admin Features
- **Holiday management** - fetch from APIs, add manually, delete
- **Schedule regeneration** when holidays change
- **Action logging** with IP tracking
- **Admin mode toggle**

## 🛠️ Tech Stack

- **Frontend**: Next.js 15 + TypeScript + Tailwind CSS + Shadcn/UI
- **Backend**: Next.js API Routes (serverless)
- **Database**: Prisma ORM + SQLite (development) / PostgreSQL (production)
- **State Management**: Zustand
- **Date Handling**: date-fns
- **Deployment**: Vercel-ready

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd kalender
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your settings:
   # - Set DATABASE_URL (SQLite for dev, PostgreSQL for prod)
   # - Set ADMIN_PASSWORD for admin access
   # - Configure WFA blocks and patterns as needed
   ```

4. **Set up the database**
   ```bash
   npx prisma migrate reset --force
   npx prisma generate
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to `http://localhost:3000`

## 🏗️ Database Schema

### WFASchedule
- Daily A/B/C/D rotation for working days
- Automatic generation based on holidays

### PublicHoliday
- Indonesian holidays from multiple APIs
- Manual holiday additions by admin
- Tracks source (API vs manual)

### UserLeave
- Employee leave requests with initials
- IPv4 tracking for edit permissions
- Date range support

### AdminLog
- Audit trail for administrative actions
- IP tracking for security

## 🔧 API Endpoints

### WFA Schedule
- `GET /api/wfa-schedule?month=YYYY-MM` - Get monthly schedule
- `POST /api/wfa-schedule` - Regenerate schedule (admin)

### Holidays
- `GET /api/holidays?year=YYYY` - Get holidays for year
- `POST /api/holidays` - Add manual holiday (admin)
- `DELETE /api/holidays?id=ID` - Remove holiday (admin)

### User Leaves
- `GET /api/user-leaves?month=YYYY-MM` - Get monthly leaves
- `GET /api/user-leaves?initials=XX` - Search by initials
- `POST /api/user-leaves` - Add leave (range support)
- `DELETE /api/user-leaves?id=ID` - Remove leave (IP/admin)

## 🎯 Usage

### For Regular Users
1. **View calendar** - WFA rotations and holidays are automatically displayed
2. **Add leave** - Click "Add Leave" button, enter initials and date range
3. **Search leaves** - Use search box to find leaves by initials
4. **Navigate** - Use arrow buttons or "Today" to navigate months

### For Administrators
1. **Toggle admin mode** - Click "Admin" button in header
2. **Manage holidays** - Click "Manage Holidays" to open admin panel
   - Fetch latest holidays from APIs
   - Add manual holidays
   - Delete holidays
   - Regenerate WFA schedule when needed
3. **Override leave management** - Admins can edit/delete any leave

## 🔒 Security Features

- **IP-based permissions** - Users can only edit their own leaves
- **IPv4 only tracking** - No IPv6 or complex network configurations
- **Admin action logging** - All administrative actions are logged
- **Input validation** - Proper validation on all forms
- **No authentication required** - Easy access for team members

## 📱 Responsive Design

The application is fully responsive and works well on:
- Desktop computers (optimal experience)
- Tablets (good layout adaptation)
- Mobile phones (compact but functional)

## 🎨 Theme Support

- **Light mode** - Clean, professional appearance
- **Dark mode** - Eye-friendly for extended use
- **System preference** - Automatically detects user preference
- **Manual toggle** - Easy switching between themes

## 🔄 WFA Rotation Logic

The A/B/C/D rotation follows these rules:
1. **Working days only** - Monday through Friday
2. **Sequential rotation** - A→B→C→D→A...
3. **Holiday aware** - Schedule shifts when holidays occur
4. **Weekend skipping** - Saturdays and Sundays don't affect rotation
5. **Monthly generation** - Schedules generated per month as needed

## ⚙️ WFA Configuration

Configure your WFA schedule through environment variables:

```bash
# Define available blocks
NEXT_PUBLIC_WFA_BLOCKS="A,B,C,D"

# Define pattern for each block (4-day cycle example)
NEXT_PUBLIC_WFA_PER_BLOCK_PATTERN=["WFA", "WFO", "WFO", "WFO"]

# Set schedule start date and initial block
NEXT_PUBLIC_WFA_START_DATE="2025-01-01"
NEXT_PUBLIC_WFA_START_PATTERN="A"
```

**Pattern Options:**
- `WFA` - Work From Anywhere (shows badge on calendar)
- `WFO` - Work From Office (no badge shown)
- `WFH` - Work From Home (no badge shown)

**Example Configurations:**
- **Every 4th day WFA**: `["WFA", "WFO", "WFO", "WFO"]`
- **Alternating days**: `["WFA", "WFO"]`
- **Weekly pattern**: `["WFA", "WFA", "WFA", "WFA", "WFA", "WFO", "WFO"]`

## 🏢 Team Usage

Perfect for teams that need:
- **Hybrid work scheduling** with predictable rotations
- **Leave tracking** without complex HR systems
- **Holiday awareness** for Indonesian teams
- **Simple, accessible** interface for all team members
- **Admin controls** for schedule management

## 🚀 Deployment

### Production with Supabase + Vercel (Recommended)

1. **Create Supabase Project**
   - Go to [supabase.com](https://supabase.com) and create new project
   - Go to Settings > Database and copy the **Prisma connection string**
   - Should look like: `postgres://postgres.xxx:password@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true`

2. **Deploy to Vercel**
   ```bash
   # Connect your repository to Vercel
   vercel --prod
   ```
   
   **Note**: The project includes automatic Prisma Client generation in the build process (`prisma generate && next build`) to fix Vercel caching issues.

3. **Set Environment Variables in Vercel Dashboard**
   - Go to your project in Vercel Dashboard
   - Settings > Environment Variables
   - Add these variables:
   
   ```env
   DATABASE_URL=postgres://postgres.YOUR_ID:YOUR_PASS@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true
   ADMIN_PASSWORD=your_secure_password
   ADMIN_LOG_MAX_ENTRIES=5000
   NEXT_PUBLIC_WFA_BLOCKS=A,B,C,D
   NEXT_PUBLIC_WFA_PER_BLOCK_PATTERN=["WFA", "WFO", "WFO", "WFO"]
   NEXT_PUBLIC_WFA_START_DATE=2025-01-01
   NEXT_PUBLIC_WFA_START_PATTERN=A
   ```

4. **Deploy to Vercel**
   ```bash
   # The vercel.json is configured to automatically:
   # 1. Copy PostgreSQL schema
   # 2. Run migrations
   # 3. Generate Prisma client
   # 4. Build the application
   
   vercel --prod
   ```

5. **Alternative: Manual Migration (if needed)**
   ```bash
   # If automatic migration fails, run manually:
   ./scripts/deploy-production.sh
   ```

### Other Deployment Options

- **Netlify** - With serverless functions + external PostgreSQL
- **Railway** - With built-in PostgreSQL database  
- **Any Node.js hosting** - With PostgreSQL database connection

### Development vs Production

| Environment | Database | Schema File | Command |
|-------------|----------|-------------|---------|
| Development | SQLite | `schema.prisma` | `npm run dev` |
| Production | PostgreSQL | `schema.production.prisma` | `npm run build:production` |

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📞 Support

For support or questions, please open an issue in the repository.

---

## 🤖 AI Development

This project was **100% built using GitHub Copilot with Claude Sonnet 4** - demonstrating the power of AI-assisted development for creating full-stack applications with complex business logic, responsive design, and production-ready features.

---

Built with ❤️ for Indonesian teams managing WFA schedules.

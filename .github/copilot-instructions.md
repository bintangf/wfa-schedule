# Copilot Instructions

<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

This is a Next.js Full Stack calendar application with the following tech stack:

## Tech Stack
- Next.js latest version with TypeScript
- Next.js API Routes for serverless functions
- Tailwind CSS + Shadcn/ui components
- Prisma ORM with SQLite (dev) / PostgreSQL (prod)
- Zustand for state management
- Deployed on Vercel

## Project Structure
- Uses App Router (`app/` directory)
- API routes in `app/api/`
- Components in `app/components/`
- Database models and migrations with Prisma
- Responsive design with mobile-first approach

## Key Features
- Calendar grid view with CRUD operations
- Event search functionality with auto-debounced search
- Dark/light mode toggle
- Mobile responsive design
- Smooth animations and transitions with overlay loading
- RESTful API endpoints
- Cross-month WFA schedule continuity
- Real-time holiday and leave management

## Code Guidelines
- Use TypeScript for type safety
- Follow React hooks best practices
- Use Zustand for client-side state management
- Implement proper error handling
- Use Tailwind CSS for styling
- Follow Next.js 14+ conventions with App Router
- Use overlay loading states to prevent layout shift
- Implement smooth transitions with React's startTransition
- Debounce user inputs for better performance

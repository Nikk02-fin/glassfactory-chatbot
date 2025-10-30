# Glass Factory Chatbot

A standalone Next.js application featuring the Glass Factory AI assistant with beautiful glassmorphism design.

## Features

- 🤖 AI-powered chat interface
- 🎨 Glassmorphism design with frosted glass effects
- 📱 Fully responsive design
- ⚡ Built with Next.js 14 and TypeScript
- 🎯 Ready for Vercel deployment

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone or download this repository
2. Install dependencies:

```bash
npm install
```

3. Copy environment variables:

```bash
cp .env.example .env.local
```

4. Start the development server:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Deployment on Vercel

### Easy Deployment

1. Push this project to a GitHub repository
2. Go to [Vercel](https://vercel.com)
3. Click "New Project" and import your GitHub repository
4. Vercel will automatically detect it's a Next.js project
5. Click "Deploy"

### Manual Deployment

Alternatively, you can deploy using Vercel CLI:

```bash
npm install -g vercel
vercel
```

### Environment Variables

The chatbot connects to the n8n webhook. The URL is already configured in the code, but if you need to change it, add this to your Vercel environment variables:

```
N8N_WEBHOOK_URL=your_webhook_url_here
```

## Project Structure

```
glassfactory-chatbot/
├── app/
│   ├── api/chat/route.ts          # Chat API endpoint
│   ├── globals.css                # Global styles
│   ├── layout.tsx                 # Root layout
│   └── page.tsx                   # Main chat page
├── components/
│   └── ChatInterface.tsx          # Main chat component
├── hooks/
│   └── user-info-status.ts        # User state management
├── assets/
│   ├── fonts/                     # Glass Factory fonts
│   └── images/                    # Logos and images
└── public/
    └── images/icons/              # UI icons
```

## Customization

### Styling
- Colors and themes are defined in `tailwind.config.ts`
- Glass effects can be customized in the `ChatInterface.tsx` component
- Fonts are loaded from the `assets/fonts/` directory

### API Integration
- The chat API is in `app/api/chat/route.ts`
- n8n webhook integration is already configured
- Session management uses localStorage for persistence

## Technologies Used

- **Next.js 14** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Zustand** - State management
- **Glassmorphism** - UI design pattern

## License

This project is part of the Glass Factory ecosystem.
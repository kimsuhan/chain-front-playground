# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Korean-language blockchain explorer (테스트넷 블록체인 탐색기) built with Next.js 15 and React 19, designed for educational purposes to help beginners understand blockchain concepts. It provides a user-friendly interface to explore blocks, transactions, and accounts on Ethereum testnets and custom networks.

## Development Commands

```bash
# Development
npm run dev                 # Start development server (port from FRONTEND_PORT env or 3000)
npm run build              # Build for production
npm start                  # Start production server

# Code Quality
npm run lint               # Run ESLint
npm run lint:fix           # Fix linting issues automatically
npm run type-check         # Run TypeScript type checking without emitting files

# Utilities
npm run clean              # Clean build artifacts (.next, dist)
```

## Environment Configuration

The application requires specific environment variables in `.env`:

```bash
# API Configuration
API_URL=http://127.0.0.1:15000    # Backend API URL (must include http://)

# Blockchain Configuration
RPC_URL=http://forlong.io:8545    # Ethereum RPC endpoint
CHAIN_ID=1337                     # Network chain ID

# Optional
DEFAULT_ACCOUNTS=0xaddr1,0xaddr2  # Comma-separated test account addresses
FRONTEND_PORT=3000                # Frontend port override
NEXT_PUBLIC_SOCKET_URL=http://localhost:4001  # Socket.io server URL
```

**Critical**: Ensure API_URL includes the protocol (`http://` or `https://`). Missing protocol causes connection failures.

## Architecture Overview

### Core Structure

- **Next.js App Router**: All pages in `src/app/` directory with TypeScript
- **Real-time Updates**: Socket.io integration for live blockchain data
- **Dual Data Sources**: Direct RPC calls via ethers.js + REST API fallback
- **MetaMask Integration**: Wallet connection context for user interactions

### Key Modules

**`src/lib/web3.ts`** - Central blockchain utility layer:

- Direct RPC communication via ethers.js JsonRpcProvider
- Typed interfaces: `BlockInfo`, `TransactionInfo`
- API integration functions with Redis caching support
- Network connection health checks

**`src/hooks/useSocket.ts`** - Real-time blockchain updates:

- Socket.io client for live block notifications
- Automatic subscription management
- Connection state handling with reconnection logic

**`src/contexts/WalletContext.tsx`** - MetaMask wallet integration:

- Connection state management
- Account change detection
- Wallet interaction utilities

### Page Structure

- **Dashboard** (`/`): Network overview with real-time stats
- **Block Explorer** (`/blocks/`, `/blocks/[id]/`): Paginated block listing and details
- **Transaction Explorer** (`/transactions/`, `/transactions/[hash]/`): Transaction history and details
- **Account Search** (`/accounts/`): Address lookup with balance and activity
- **Specialized Features**:
  - Token Factory (`/token-factory/`): ERC-20 token management
  - Uniswap V2 Integration (`/uniswap-v2/`): DEX interactions

### Component Architecture

- **Shared Components**: `Header`, `LoadingSpinner`, `ErrorMessage`
- **Specialized**: `MerkleTreeVisualization` for advanced cryptographic displays
- **Layout**: Root layout with Korean locale and Tailwind styling

## Development Patterns

### Data Fetching Strategy

1. **Primary**: Direct RPC calls via ethers.js for real-time accuracy
2. **Fallback**: REST API with Redis caching for performance
3. **Real-time**: Socket.io for live updates without polling

### Error Handling

- Graceful degradation when RPC/API unavailable
- Korean-language error messages for user friendliness
- Console logging for debugging (Korean comments in code)

### TypeScript Configuration

- Strict mode enabled with `@/*` path aliases
- Next.js plugin integration
- Target ES2017 for broad compatibility

## ESLint Configuration

- Next.js + TypeScript rules
- Disabled rules: `react-hooks/exhaustive-deps`, `@typescript-eslint/no-explicit-any`
- Custom config in `eslint.config.mjs`

## API Integration Patterns

The application communicates with a separate blockchain API server (typically on port 15000):

- `/block?limit=N&offset=N` - Paginated block data
- `/block/{blockNumber}` - Cached block details
- `/block/transactions?limit=N&offset=N` - Transaction listing
- `/token-factory/tokens?limit=N&offset=N` - Token data

When adding new API endpoints, follow the established error handling patterns and maintain the dual RPC/API approach for data resilience.

## Development Notes

- Korean comments throughout codebase for educational purposes
- Component names and file structure follow English conventions
- UI text and error messages in Korean for target audience
- Real-time features depend on both RPC connectivity and Socket.io server
- Built for educational/testnet use, not production blockchain networks

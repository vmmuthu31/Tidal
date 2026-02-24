# 📚 Documentation Index - Sui CRM

Welcome to the Sui CRM documentation! This guide will help you understand the complete system.

## 🎯 Start Here

If you're new to the project, read these in order:

1. **[SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md)** - High-level overview of the entire system
2. **[USER_FLOW.md](./USER_FLOW.md)** - Step-by-step user journeys
3. **[ENCRYPTION_FLOW_DETAILED.md](./ENCRYPTION_FLOW_DETAILED.md)** - Deep dive into encryption/decryption

## 📖 Core Documentation

### Architecture & Design
- **[SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md)**
  - Complete system architecture diagrams
  - Data flow visualizations
  - Technology stack
  - Security guarantees
  - Deployment architecture

### User Flows
- **[USER_FLOW.md](./USER_FLOW.md)**
  - Organization setup
  - Team management
  - Profile creation
  - Note & file management
  - Access control scenarios

### Encryption & Security
- **[ENCRYPTION_FLOW_DETAILED.md](./ENCRYPTION_FLOW_DETAILED.md)**
  - What gets encrypted vs public
  - Detailed encryption flow (8 steps)
  - Detailed decryption flow (13 steps)
  - Access control logic
  - Security scenarios

- **[SEAL_ACCESS_CONTROL.md](./SEAL_ACCESS_CONTROL.md)**
  - Seal integration architecture
  - Access control module design
  - Role-based permissions
  - Integration with Walrus
  - Code examples

## 🛠️ Developer Guides

### Configuration & Setup
- **[CONFIG_SERVICES_UPDATE.md](./CONFIG_SERVICES_UPDATE.md)**
  - Migration from DID to CRM
  - Configuration file changes
  - Service updates
  - Integration examples
  - Testing checklist

### Quick Reference
- **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)**
  - Import statements
  - Constants & enums
  - Contract functions
  - API endpoints
  - Common code patterns
  - Environment variables

## 📂 Documentation Structure

```
docs/
├── README.md (this file)
├── SYSTEM_ARCHITECTURE.md      # 🏗️ System overview
├── USER_FLOW.md                # 👤 User journeys
├── ENCRYPTION_FLOW_DETAILED.md # 🔐 Encryption deep dive
├── SEAL_ACCESS_CONTROL.md      # 🛡️ Access control
├── CONFIG_SERVICES_UPDATE.md   # ⚙️ Configuration guide
└── QUICK_REFERENCE.md          # ⚡ Quick reference
```

## 🎓 Learning Paths

### For Product Managers
1. Read [USER_FLOW.md](./USER_FLOW.md) - Understand user experience
2. Read [ENCRYPTION_FLOW_DETAILED.md](./ENCRYPTION_FLOW_DETAILED.md) - Understand what's encrypted
3. Review [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md) - Understand capabilities

### For Frontend Developers
1. Read [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) - Get coding quickly
2. Read [CONFIG_SERVICES_UPDATE.md](./CONFIG_SERVICES_UPDATE.md) - Understand services
3. Read [ENCRYPTION_FLOW_DETAILED.md](./ENCRYPTION_FLOW_DETAILED.md) - Implement encryption UI

### For Smart Contract Developers
1. Read [SEAL_ACCESS_CONTROL.md](./SEAL_ACCESS_CONTROL.md) - Understand Move contracts
2. Read [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md) - Understand contract interactions
3. Review contract source code in `/contracts/sui_crm/sources/`

### For Backend Developers
1. Read [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md) - Understand backend role
2. Read [CONFIG_SERVICES_UPDATE.md](./CONFIG_SERVICES_UPDATE.md) - Understand API endpoints
3. Read [SEAL_ACCESS_CONTROL.md](./SEAL_ACCESS_CONTROL.md) - Understand events to index

## 🔑 Key Concepts

### What is Seal?
Seal is a threshold encryption protocol that enables:
- **Client-side encryption** - Data encrypted in browser
- **Distributed key management** - No single point of failure
- **Onchain access control** - Blockchain verifies permissions
- **Zero-knowledge decryption** - Storage layer never sees plaintext

### What is Walrus?
Walrus is a decentralized storage network that provides:
- **Blob storage** - Store encrypted files
- **Erasure coding** - Data redundancy
- **Decentralized** - No single storage provider
- **Cost-effective** - Pay per epoch

### What is Sui?
Sui is a Layer 1 blockchain that offers:
- **Move language** - Safe smart contracts
- **Object-centric** - Everything is an object
- **Parallel execution** - High throughput
- **Low latency** - Fast finality

## 🚀 Quick Start

### 1. Set Up Environment
```bash
# Clone repository
git clone https://github.com/vmmuthu31/Sui-CRM.git
cd Sui-CRM

# Install dependencies
cd web
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your values
```

### 2. Deploy Contracts
```bash
cd contracts/sui_crm
sui move build
sui client publish --gas-budget 100000000

# Copy package ID and update web/lib/config/contracts.ts
```

### 3. Run Frontend
```bash
cd web
npm run dev
# Open http://localhost:3000
```

### 4. Test Encryption Flow
1. Create organization
2. Add team member
3. Create contact profile
4. Add encrypted note
5. Try to decrypt as different roles

## 📊 Use Cases

### 1. Community → Onchain Conversion Tracking
**Scenario:** Track Discord users who mint NFTs

**Flow:**
1. Create profile for Discord user (public)
2. Link wallet address when they connect (public)
3. Track Discord interactions (public)
4. Track onchain mints/stakes (public)
5. Add internal notes about engagement strategy (encrypted)

### 2. VC Deal Management
**Scenario:** Track investor relationships

**Flow:**
1. Create profile for VC firm (public)
2. Add contact person's socials (public)
3. Upload pitch deck (encrypted - Admins only)
4. Add negotiation notes (encrypted - Admins only)
5. Track token allocation (encrypted - Admins only)

### 3. Whale Tracking
**Scenario:** Monitor high-value users

**Flow:**
1. Create profile for whale wallet (public)
2. Track onchain activity (public)
3. Add internal tag "VIP" (encrypted)
4. Add strategy notes (encrypted - Managers+)
5. Upload partnership agreement (encrypted - Admins only)

## 🔒 Security Best Practices

### For Users
- ✅ Always verify you're on the correct domain
- ✅ Review transaction details before signing
- ✅ Use hardware wallet for high-value operations
- ✅ Set appropriate access levels for sensitive data
- ✅ Regularly review team member permissions

### For Developers
- ✅ Never log decrypted data
- ✅ Clear session keys after use
- ✅ Validate all user inputs
- ✅ Use environment variables for secrets
- ✅ Implement rate limiting on API endpoints
- ✅ Audit smart contracts before deployment

## 🐛 Troubleshooting

### Encryption Fails
**Problem:** `encryptAndUploadResource` returns error

**Solutions:**
1. Check Walrus publishers are accessible
2. Verify Seal key servers are online
3. Ensure org registry ID is correct
4. Check file size limits

### Decryption Fails
**Problem:** `downloadAndDecryptResources` returns "Access Denied"

**Solutions:**
1. Verify user has sufficient role
2. Check if user is org member
3. Ensure session key is valid
4. Verify resource exists onchain

### Transaction Fails
**Problem:** Sui transaction fails

**Solutions:**
1. Check gas budget is sufficient
2. Verify object IDs are correct
3. Ensure wallet has enough SUI
4. Check if objects are shared/owned correctly

## 📞 Support

### Resources
- **GitHub Issues:** https://github.com/vmmuthu31/Sui-CRM/issues
- **Sui Documentation:** https://docs.sui.io
- **Seal Documentation:** https://docs.sui.io/guides/developer/cryptography/seal
- **Walrus Documentation:** https://docs.walrus.site

### Community
- **Discord:** [Join our Discord](#)
- **Twitter:** [@SuiCRM](#)

## 🗺️ Roadmap

### Phase 1: Core CRM (Current)
- [x] Organization management
- [x] Profile management
- [x] Encrypted notes
- [x] Encrypted files
- [x] Role-based access control
- [x] Interaction logging

### Phase 2: Enhanced Features
- [ ] Advanced search & filters
- [ ] Bulk operations
- [ ] Email integration
- [ ] Calendar integration
- [ ] Mobile app

### Phase 3: Analytics & AI
- [ ] Engagement analytics
- [ ] Conversion funnels
- [ ] AI-powered insights
- [ ] Predictive scoring
- [ ] Automated workflows

### Phase 4: Integrations
- [ ] Discord bot
- [ ] Telegram bot
- [ ] Twitter integration
- [ ] Snapshot integration
- [ ] DeFi protocol integrations

## 📝 Contributing

We welcome contributions! Please read our contributing guidelines:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

---

**Last Updated:** February 10, 2026  
**Version:** 1.0.0  
**Maintainers:** Sui CRM Team

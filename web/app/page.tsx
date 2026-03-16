"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { SessionManager } from "@/lib/zklogin/session";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  Users,
  Lock,
  Globe,
  Database,
  ArrowRight,
  Activity,
  Star,
  Check
} from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

export default function Home() {
  const router = useRouter();
  const walletAccount = useCurrentAccount();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const zkProof = SessionManager.getProof();
    const isAuthenticated = !!walletAccount || !!zkProof;
    if (isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [mounted, walletAccount, router]);

  return (
    <div className="min-h-screen bg-white text-[#1A1A1A] overflow-x-hidden font-sans selection:bg-[#1A1A1A] selection:text-white">

      {/* Soft gradient background mesh with grid overlay fading to bottom */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:linear-gradient(to_bottom,white_20%,transparent_100%)]" />
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#E5F0FF]/60 rounded-full blur-[120px]" />
        <div className="absolute top-[10%] right-[-10%] w-[50%] h-[50%] bg-[#F0E5FF]/60 rounded-full blur-[120px]" />
        <div className="absolute top-[40%] left-[20%] w-[60%] h-[60%] bg-[#E5F9FF]/40 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10">
        {/* ── Nav ─────────────────────────────────────────────────────────── */}
        <motion.nav
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full bg-white/60 backdrop-blur-xl border-b border-black/5"
        >
          <div className="max-w-7xl mx-auto px-6 lg:px-12 h-20 flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="relative size-10 flex items-center justify-center rounded-2xl bg-gradient-to-tr from-[#1A1A1A] to-gray-800 shadow-md">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 4L4 8L12 12L20 8L12 4Z" fill="url(#paint0_linear)" />
                  <path d="M4 16L12 20L20 16" stroke="url(#paint1_linear)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M4 12V16L12 20V16L4 12Z" fill="white" fillOpacity="0.2" />
                  <defs>
                    <linearGradient id="paint0_linear" x1="12" y1="4" x2="12" y2="12" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#60A5FA" />
                      <stop offset="1" stopColor="#A78BFA" />
                    </linearGradient>
                    <linearGradient id="paint1_linear" x1="12" y1="16" x2="12" y2="20" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#60A5FA" />
                      <stop offset="1" stopColor="#A78BFA" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <span className="font-extrabold text-[#1A1A1A] tracking-[-0.03em] text-[22px] cursor-pointer">Tidal</span>
            </div>

            {/* Nav Links */}
            <div className="hidden md:flex items-center gap-10 text-[15px] text-gray-500 font-medium">
              <a href="#features" className="hover:text-[#1A1A1A] transition-colors">Features</a>
              <a href="#security" className="hover:text-[#1A1A1A] transition-colors">Security</a>
              <a href="#pricing" className="hover:text-[#1A1A1A] transition-colors">Pricing</a>
              <a href="https://github.com" target="_blank" className="hover:text-[#1A1A1A] transition-colors flex items-center gap-1">Open Source <ArrowRight className="size-3" /></a>
            </div>

            {/* Auth Buttons */}
            <div className="flex items-center gap-4">
              <Link
                href="/login"
                className="hidden sm:inline-block text-[15px] font-semibold text-[#1A1A1A] hover:opacity-70 transition-opacity px-4"
              >
                Log in
              </Link>
              <Link
                href="/login"
                className="flex items-center justify-center h-11 px-6 bg-[#1A1A1A] hover:bg-black text-white rounded-full text-[15px] font-semibold transition-transform active:scale-95"
              >
                Launch App
              </Link>
            </div>
          </div>
        </motion.nav>

        {/* ── Hero ────────────────────────────────────────────────────────── */}
        <section className="relative pt-32 pb-24 px-6">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="relative max-w-4xl mx-auto text-center flex flex-col items-center"
          >
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 bg-white/60 backdrop-blur-md text-gray-700 text-sm font-semibold shadow-sm mb-6">
              <div className="size-2 bg-blue-600 rounded-full animate-pulse" />
              Built on Sui Network · Testnet Live
            </motion.div>

            <motion.h1 variants={fadeUp} className="text-5xl sm:text-7xl lg:text-[76px] font-bold tracking-[-0.04em] text-[#1A1A1A] leading-[1.05] max-w-[850px]">
              Get a Grip on Your Business <br className="hidden md:block" /> Future with Tidal
            </motion.h1>

            <motion.p variants={fadeUp} className="mt-8 text-[19px] text-gray-500 max-w-[650px] mx-auto leading-[1.6] font-medium">
              Tidal is the first Web3-native CRM that stores contact profiles, notes, and files
              directly on the Sui blockchain — secured by threshold encryption so only your team can read them.
            </motion.p>

            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
              <Link
                href="/login"
                className="flex items-center justify-center h-14 px-8 bg-[#1A1A1A] hover:bg-black text-white rounded-full font-semibold text-[16px] transition-transform active:scale-[0.98] w-full sm:w-auto"
              >
                Start for Free
              </Link>
              <a
                href="#security"
                className="flex items-center justify-center h-14 px-8 bg-transparent text-[#1A1A1A] rounded-full font-semibold text-[16px] transition-transform border border-gray-300 hover:border-gray-400 active:scale-[0.98] w-full sm:w-auto"
              >
                How it works
              </a>
            </motion.div>

            {/* Avatars & Social Proof */}
            <motion.div variants={fadeUp} className="mt-14 flex flex-col items-center gap-3">
              <div className="flex -space-x-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="size-10 rounded-full border-2 border-white bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center overflow-hidden relative shadow-sm hover:-translate-y-1 transition-transform">
                    <span className="text-sm font-bold text-gray-500">{String.fromCharCode(64 + i)}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-1.5 text-yellow-500">
                <Star className="size-4 fill-current" />
                <Star className="size-4 fill-current" />
                <Star className="size-4 fill-current" />
                <Star className="size-4 fill-current" />
                <Star className="size-4 fill-current" />
              </div>
              <p className="text-[14px] font-semibold text-gray-600">Trusted by Web3 Builders</p>
            </motion.div>

            {/* Glowing Stats Card */}
            <motion.div
              variants={fadeUp}
              className="mt-16 w-full max-w-[800px] flex flex-col md:flex-row items-center justify-between bg-white/70 backdrop-blur-xl border border-white/50 rounded-[32px] p-8 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] relative overflow-hidden group hover:bg-white/90 transition-colors cursor-default"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-white/40 to-transparent pointer-events-none" />

              <div className="flex-1 text-center md:text-left px-4 relative z-10 w-full md:w-auto pb-6 md:pb-0 border-b md:border-b-0 border-black/5 md:border-r transition-transform group-hover:scale-105 duration-300">
                <p className="text-4xl font-extrabold text-[#1A1A1A] tracking-tight">2.5s</p>
                <p className="text-[14px] text-gray-500 font-medium mt-1">Sub-second Finality</p>
              </div>

              <div className="flex-1 text-center px-4 relative z-10 w-full md:w-auto py-6 md:py-0 border-b md:border-b-0 border-black/5 md:border-r transition-transform group-hover:scale-105 duration-300 delay-75">
                <p className="text-4xl font-extrabold text-[#1A1A1A] tracking-tight">0</p>
                <p className="text-[14px] text-gray-500 font-medium mt-1">Gas paid by CRM Users</p>
              </div>

              <div className="flex-1 text-center md:text-right px-4 relative z-10 w-full md:w-auto pt-6 md:pt-0 transition-transform group-hover:scale-105 duration-300 delay-150">
                <p className="text-4xl font-extrabold text-[#1A1A1A] tracking-tight">Sui</p>
                <p className="text-[14px] text-gray-500 font-medium mt-1">Network Native</p>
              </div>
            </motion.div>
          </motion.div>
        </section>

        {/* ── Logo Cloud ──────────────────────────────────────────────────── */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={staggerContainer}
          className="py-16 border-y border-black/5 relative z-10 bg-white"
        >
          <div className="max-w-5xl mx-auto px-6 text-center">
            <motion.h3 variants={fadeUp} className="text-[26px] font-bold tracking-tight text-[#1A1A1A]">Integrated natively within the Sui Ecosystem</motion.h3>
            <motion.p variants={fadeUp} className="text-gray-500 text-[15px] mt-3 mb-10">We utilize cutting-edge protocols to secure your organization's data.</motion.p>
            <motion.div variants={fadeUp} className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
              {["zkLogin", "Walrus Storage", "Enoki Gas Pool", "SuiNS"].map((name, i) => (
                <div key={i} className="flex items-center gap-2 text-[#1A1A1A] font-bold text-xl hover:scale-110 transition-transform cursor-pointer">
                  <div className="size-8 rounded-lg bg-gray-200" />
                  {name}
                </div>
              ))}
            </motion.div>
          </div>
        </motion.section>

        {/* ── Global Map Section ──────────────────────────────────────────── */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          id="security"
          className="py-24 px-6 relative z-10 bg-white"
        >
          <motion.div variants={fadeUp} className="max-w-6xl mx-auto bg-[#F8F9FA] rounded-[40px] p-12 lg:p-20 text-center relative overflow-hidden group">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-[#1A1A1A] mb-4">Your data is yours. Cryptographically.</h2>
            <p className="text-gray-500 text-[16px]">Traditional CRMs store your customer data in their database and grant you access.<br />Tidal flips this — the data lives on-chain and access is gated by cryptographic proofs.</p>

            <motion.div variants={fadeUp} className="mt-16 relative w-full h-[400px] max-w-4xl mx-auto opacity-90 transition-transform duration-700 group-hover:scale-[1.02]">
              <div className="absolute inset-0 bg-white border border-gray-100 rounded-[32px] overflow-hidden p-8 flex flex-col items-center justify-center gap-8 shadow-sm">

                <div className="flex flex-col md:flex-row items-center justify-center gap-12 w-full max-w-2xl text-left">
                  <div className="flex-1 bg-blue-50/50 p-6 rounded-3xl border border-blue-100 transform hover:-translate-y-2 transition-transform duration-300">
                    <ShieldCheck className="size-10 text-blue-600 mb-4" />
                    <h4 className="font-bold text-gray-900 text-xl mb-2">Seal SDK</h4>
                    <p className="text-sm text-gray-600">Encryption keys are split across independent key servers. A threshold must agree after verifying your role.</p>
                  </div>
                  <div className="hidden md:flex text-gray-300 animate-pulse">
                    <ArrowRight className="size-8" />
                  </div>
                  <div className="flex-1 bg-purple-50/50 p-6 rounded-3xl border border-purple-100 transform hover:-translate-y-2 transition-transform duration-300">
                    <Database className="size-10 text-purple-600 mb-4" />
                    <h4 className="font-bold text-gray-900 text-xl mb-2">Move Contracts</h4>
                    <p className="text-sm text-gray-600">Your OrgAccessRegistry is a Move object on Sui authorizing decryption — no centralized backend involved.</p>
                  </div>
                </div>

              </div>
            </motion.div>
          </motion.div>
        </motion.section>

        {/* ── Thriving Business Hub (Features grid) ───────────────────────── */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="py-24 px-6 border-t border-black/5 relative z-10 bg-white"
        >
          <div className="max-w-6xl mx-auto">
            <motion.div variants={fadeUp} className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-[#1A1A1A] max-w-2xl mx-auto leading-tight">
                A Web3 CRM designed for<br />privacy and scale
              </h2>
              <p className="text-gray-500 text-[16px] mt-4">Built from the ground up for organizations that need real data security.</p>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
              {/* Left Image */}
              <motion.div variants={fadeUp} className="rounded-[40px] overflow-hidden bg-gray-100 flex-1 relative min-h-[400px] group">
                <img src="https://images.unsplash.com/photo-1553877522-43269d4ea984?ixlib=rb-4.0.3&auto=format&fit=crop&w=1470&q=80" alt="Professional" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
              </motion.div>

              {/* Right Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 flex-1">
                {[
                  { title: "Role-Based Access", desc: "Viewer, Member, Manager, Admin — each role enforced seamlessly on-chain.", icon: Users, bg: "bg-blue-100", text: "text-blue-600" },
                  { title: "Zero-Knowledge Auth", desc: "Sign in with Google. zkLogin generates a self-custodial wallet instantly.", icon: Activity, bg: "bg-purple-100", text: "text-purple-600" },
                  { title: "Threshold Encryption", desc: "Even the node operators cannot read your clients' structured data.", icon: Lock, bg: "bg-emerald-100", text: "text-emerald-600" },
                  { title: "Walrus Storage", desc: "Huge binary files mapped securely and decentralized directly on Sui.", icon: Globe, bg: "bg-orange-100", text: "text-orange-600" },
                ].map((item, i) => (
                  <motion.div variants={fadeUp} key={i} className="bg-[#F8F9FA] rounded-[32px] p-8 hover:bg-[#F0F2F5] transition-all cursor-pointer border border-black/5 hover:-translate-y-1 hover:shadow-md">
                    <div className={`size-12 rounded-2xl ${item.bg} ${item.text} flex items-center justify-center mb-6`}>
                      <item.icon className="size-6" />
                    </div>
                    <h3 className="text-xl font-bold text-[#1A1A1A] mb-2">{item.title}</h3>
                    <p className="text-[14px] text-gray-500 font-medium leading-[1.6]">{item.desc}</p>
                  </motion.div>
                ))}
              </div>
            </div>

            <motion.div variants={fadeUp} className="flex justify-center mt-12">
              <Link href="/login" className="bg-[#1A1A1A] text-white px-8 py-4 rounded-full font-semibold hover:bg-black transition-transform hover:scale-105 active:scale-95 shadow-xl">Start your Organization</Link>
            </motion.div>
          </div>
        </motion.section>

        {/* ── Key Features Split ──────────────────────────────────────────── */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="py-24 px-6 border-t border-black/5 relative z-10 bg-white"
        >
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div variants={fadeUp}>
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-[#1A1A1A] leading-tight mb-6">
                Your entire workflow, secured fully on-chain
              </h2>
              <p className="text-gray-500 text-[16px] mb-12">
                Replace your legacy SaaS tools with mathematically verified data ownership.
              </p>

              <div className="space-y-8">
                {[
                  { title: "Immutable Profiles", desc: "Every contact created is an object on the Sui blockchain owned by your team." },
                  { title: "Sponsored Transactions", desc: "Set up Enoki pools. Your marketing team never needs to hold SUI tokens for gas." },
                  { title: "Dynamic Policies", desc: "Configure reading and writing abilities directly into Move contract logic." }
                ].map((item, i) => (
                  <div key={i} className="flex gap-4 group">
                    <div className="mt-1">
                      <div className="size-5 rounded-full bg-[#1A1A1A] flex items-center justify-center group-hover:bg-blue-600 transition-colors">
                        <Check className="size-3 text-white" />
                      </div>
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-[#1A1A1A] mb-1">{item.title}</h4>
                      <p className="text-[14px] text-gray-500">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
            <motion.div variants={fadeUp} className="rounded-[40px] overflow-hidden bg-gray-100 relative min-h-[500px] border border-black/5 group">
              <img src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?ixlib=rb-4.0.3&auto=format&fit=crop&w=1470&q=80" alt="Business team" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
            </motion.div>
          </div>
        </motion.section>

        {/* ── Pricing ─────────────────────────────────────────────────────── */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          id="pricing"
          className="py-24 px-6 border-t border-black/5 bg-[#F8F9FA]/50 relative z-10"
        >
          <div className="max-w-6xl mx-auto">
            <motion.div variants={fadeUp} className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-[#1A1A1A]">Fully Open Source and Free</h2>
              <p className="text-gray-500 text-[16px] mt-4">Tidal is open source. Run it locally or use our hosted testnet gateway.</p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { name: "Testnet Access", price: "$ 0", bg: "bg-white", border: "border-black/5", btn: "Enter App" },
                { name: "Self-Hosted Node", price: "Free", bg: "bg-gradient-to-br from-[#F3F0FF] to-white", border: "border-[#D8B4E2]", highlight: true, btn: "View GitHub" },
                { name: "Mainnet Starter", price: "Soon", bg: "bg-[#F0FDF4]", border: "border-green-200", btn: "Join Waitlist" }
              ].map((plan, i) => (
                <motion.div variants={fadeUp} key={i} className={`${plan.bg} rounded-[40px] p-10 border ${plan.border} flex flex-col items-center text-center hover:-translate-y-2 transition-transform shadow-sm hover:shadow-xl`}>
                  <p className="font-semibold text-gray-500 mb-2">{plan.name}</p>
                  <h3 className="text-4xl font-bold text-[#1A1A1A] tracking-tight mb-2">{plan.price}</h3>
                  <p className="text-[13px] text-gray-400 mb-8">Access all features and premium cryptographic support for your team.</p>

                  <div className="w-full space-y-4 mb-10 text-left">
                    {["Unlimited team members", "Access to all features", "zkLogin authentication", "Data Ownership"].map((feat, j) => (
                      <div key={j} className="flex items-center gap-3">
                        <Check className={`size-4 ${plan.highlight ? 'text-purple-600' : 'text-gray-400'}`} />
                        <span className="text-[14px] font-medium text-gray-600">{feat}</span>
                      </div>
                    ))}
                  </div>

                  <button className={`mt-auto w-full py-4 rounded-full font-bold transition-all hover:scale-105 active:scale-95 ${plan.highlight ? 'bg-[#1A1A1A] text-white shadow-xl hover:bg-black' : 'bg-transparent border border-gray-300 text-[#1A1A1A] hover:border-[#1A1A1A]'}`}>
                    {plan.btn}
                  </button>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* ── Testimonials ────────────────────────────────────────────────── */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="py-24 px-6 border-t border-black/5 relative z-10 bg-white"
        >
          <div className="max-w-6xl mx-auto text-center">
            <motion.h2 variants={fadeUp} className="text-4xl md:text-5xl font-bold tracking-tight text-[#1A1A1A] mb-16">What builders say about Tidal</motion.h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
              {[
                { name: "Alex Chen", role: "Founder, Web3 Startup", text: "Tidal showed us what's actually possible. Using Walrus for file storage instead of AWS saves us tons of money." },
                { name: "Sarah Jenkins", role: "Sales Director", text: "The zero-knowledge login means my sales reps don't have to deal with seed phrases to interact on chain." },
                { name: "Mike Rostova", role: "DAOs Lead", text: "Finally an organizational tool prioritizing privacy. The threshold encryption integrations are magnificent." }
              ].map((t, i) => (
                <motion.div variants={fadeUp} key={i} className="p-8 bg-white border border-gray-100 rounded-[32px] shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all">
                  <p className="text-[15px] text-gray-600 leading-[1.6] mb-6">
                    "{t.text}"
                  </p>
                  <div className="flex items-center gap-4">
                    <img src={`https://i.pravatar.cc/100?img=${i + 20}`} alt="user" className="size-12 rounded-full object-cover bg-gray-100" />
                    <div>
                      <p className="font-bold text-[#1A1A1A] text-[15px]">{t.name}</p>
                      <p className="text-[13px] text-gray-500">{t.role}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* ── CTA ─────────────────────────────────────────────────────────── */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="py-24 px-6 relative z-10 bg-white"
        >
          <motion.div variants={fadeUp} className="max-w-5xl mx-auto bg-gradient-to-r from-[#E5F0FF] to-[#F0E5FF] rounded-[40px] p-16 md:p-24 text-center border border-white relative overflow-hidden shadow-sm group">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-[#1A1A1A] mb-4">
              Embark on the journey to data ownership
            </h2>
            <p className="text-lg text-gray-600 mb-10">Launch your resilient organization natively on the Sui blockchain today.</p>
            <div className="flex justify-center gap-4">
              <Link href="/login" className="bg-[#1A1A1A] text-white px-8 py-4 rounded-full font-bold hover:bg-black transition-transform shadow-xl text-[15px] hover:scale-105 active:scale-95">Launch App</Link>
              <a href="https://github.com" target="_blank" className="bg-white text-[#1A1A1A] px-8 py-4 rounded-full font-bold hover:bg-gray-50 transition-colors border border-gray-200 text-[15px] hover:scale-105 active:scale-95">View GitHub</a>
            </div>
          </motion.div>
        </motion.section>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <footer className="pt-20 pb-10 px-6 border-t border-black/5 relative overflow-hidden bg-white z-10">
          {/* Giant Background Text */}
          <div className="absolute inset-x-0 bottom-[-50px] text-center pointer-events-none opacity-[0.03] select-none flex justify-center">
            <span className="text-[25vw] font-black tracking-tighter leading-none block whitespace-nowrap">Tidal</span>
          </div>

          <div className="max-w-7xl mx-auto relative z-10">
            <div className="flex flex-col items-center justify-center mb-16">
              <div className="relative size-12 flex items-center justify-center rounded-2xl bg-gradient-to-tr from-[#1A1A1A] to-gray-800 shadow-md mb-6 hover:scale-110 transition-transform">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 4L4 8L12 12L20 8L12 4Z" fill="url(#pf0_linear)" />
                  <path d="M4 16L12 20L20 16" stroke="url(#pf1_linear)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M4 12V16L12 20V16L4 12Z" fill="white" fillOpacity="0.2" />
                  <defs>
                    <linearGradient id="pf0_linear" x1="12" y1="4" x2="12" y2="12" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#60A5FA" />
                      <stop offset="1" stopColor="#A78BFA" />
                    </linearGradient>
                    <linearGradient id="pf1_linear" x1="12" y1="16" x2="12" y2="20" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#60A5FA" />
                      <stop offset="1" stopColor="#A78BFA" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-[#1A1A1A] text-center">Built on Sui. Secured by cryptography.</h2>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-5 gap-8 mb-20 text-[14px]">
              <div>
                <p className="font-bold text-[#1A1A1A] mb-4">Product</p>
                <ul className="space-y-3 text-gray-500 font-medium">
                  <li><a href="#" className="hover:text-black transition-colors">Features</a></li>
                  <li><a href="#" className="hover:text-black transition-colors">Pricing</a></li>
                  <li><a href="#" className="hover:text-black transition-colors">Integrations</a></li>
                  <li><a href="#" className="hover:text-black transition-colors">Changelog</a></li>
                </ul>
              </div>
              <div>
                <p className="font-bold text-[#1A1A1A] mb-4">Ecosystem</p>
                <ul className="space-y-3 text-gray-500 font-medium">
                  <li><a href="#" className="hover:text-black transition-colors">Sui Network</a></li>
                  <li><a href="#" className="hover:text-black transition-colors">Walrus</a></li>
                  <li><a href="#" className="hover:text-black transition-colors">Enoki</a></li>
                  <li><a href="#" className="hover:text-black transition-colors">Mysten Labs</a></li>
                </ul>
              </div>
              <div>
                <p className="font-bold text-[#1A1A1A] mb-4">Developers</p>
                <ul className="space-y-3 text-gray-500 font-medium">
                  <li><a href="#" className="hover:text-black transition-colors">GitHub</a></li>
                  <li><a href="#" className="hover:text-black transition-colors">Documentation</a></li>
                  <li><a href="#" className="hover:text-black transition-colors">Smart Contracts</a></li>
                  <li><a href="#" className="hover:text-black transition-colors">Audits</a></li>
                </ul>
              </div>
              <div>
                <p className="font-bold text-[#1A1A1A] mb-4">Resources</p>
                <ul className="space-y-3 text-gray-500 font-medium">
                  <li><a href="#" className="hover:text-black transition-colors">Terms of Service</a></li>
                  <li><a href="#" className="hover:text-black transition-colors">Privacy Policy</a></li>
                  <li><a href="#" className="hover:text-black transition-colors">Cookie Policy</a></li>
                </ul>
              </div>
              <div>
                <p className="font-bold text-[#1A1A1A] mb-4">Social</p>
                <ul className="space-y-3 text-gray-500 font-medium">
                  <li><a href="#" className="hover:text-black transition-colors">Twitter</a></li>
                  <li><a href="#" className="hover:text-black transition-colors">Discord</a></li>
                  <li><a href="#" className="hover:text-black transition-colors">Telegram</a></li>
                </ul>
              </div>
            </div>

            <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-black/5 text-[14px] text-gray-400 font-medium">
              <p>© 2024 Tidal Open Sourced.</p>
              <div className="flex gap-4 mt-4 md:mt-0">
                <a href="#" className="hover:text-black transition-colors">Privacy Policy</a>
                <a href="#" className="hover:text-black transition-colors">Terms and Conditions</a>
                <a href="#" className="hover:text-black transition-colors">Sitemap</a>
              </div>
            </div>
          </div>
        </footer>

      </div>
    </div>
  );
}

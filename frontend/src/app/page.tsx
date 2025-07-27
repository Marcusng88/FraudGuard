import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { DecentralizedGlobe } from "../components/ui/DecentralizedGlobe";
import { Aurora } from "../components/ui/Aurora";
import Link from "next/link";

export default function Home() {
  return (
    <div className="w-full relative">
      {/* Aurora Background */}
      <Aurora />
      {/* Hero Section */}
      <section className="min-h-[calc(100vh-4rem)] flex items-center justify-center section-padding">
        <div className="container">
          <div className="flex flex-col lg:grid lg:grid-cols-2 gap-16 lg:gap-20 items-center">
            {/* Text content */}
            <div className="text-center lg:text-left space-y-10 order-2 lg:order-1">
              <div className="space-y-6">
                <h1 className="text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold leading-tight tracking-tight">
                  Trade NFTs with{" "}
                  <span className="text-gradient bg-clip-text text-transparent bg-gradient-to-r from-[var(--primary-blue)] to-[var(--primary-purple)]">
                    Confidence
                  </span>
                </h1>
                <p className="text-xl md:text-2xl lg:text-3xl text-[var(--text-secondary)] leading-relaxed max-w-3xl mx-auto lg:mx-0 font-light">
                  AI-powered fraud detection keeps you safe from plagiarism, scams, and suspicious activity in the NFT marketplace.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-6 justify-center lg:justify-start items-center">
                <Link href="/marketplace">
                  <Button
                    size="lg"
                    className="w-full sm:w-auto px-10 py-5 text-lg font-semibold rounded-xl shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
                  >
                    🛒 Explore Marketplace
                  </Button>
                </Link>
                <Link href="/profile/create">
                  <Button
                    variant="secondary"
                    size="lg"
                    className="w-full sm:w-auto px-10 py-5 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                  >
                    🎨 Create NFT
                  </Button>
                </Link>
              </div>

              {/* Trust indicators */}
              <div className="flex flex-wrap justify-center lg:justify-start gap-6 pt-4">
                <div className="flex items-center gap-2 text-[var(--text-muted)] text-sm">
                  <span className="text-green-400">🛡️</span>
                  <span>AI-Powered Protection</span>
                </div>
                <div className="flex items-center gap-2 text-[var(--text-muted)] text-sm">
                  <span className="text-blue-400">⚡</span>
                  <span>Real-time Detection</span>
                </div>
                <div className="flex items-center gap-2 text-[var(--text-muted)] text-sm">
                  <span className="text-purple-400">🔒</span>
                  <span>Secure Trading</span>
                </div>
              </div>
            </div>

            {/* Globe */}
            <div className="flex justify-center lg:justify-end order-1 lg:order-2">
              <div className="globe-container">
                <DecentralizedGlobe size="md" className="lg:scale-110 drop-shadow-2xl" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="section-padding bg-[var(--bg-surface)]">
        <div className="container">
          <div className="text-center content-spacing">
            <h2 className="text-5xl md:text-6xl font-bold mb-8 tracking-tight">
              Protected by{" "}
              <span className="text-gradient bg-clip-text text-transparent bg-gradient-to-r from-[var(--primary-blue)] to-[var(--primary-purple)]">
                AI
              </span>
            </h2>
            <p className="text-xl md:text-2xl text-[var(--text-secondary)] max-w-4xl mx-auto leading-relaxed font-light">
              Our advanced AI agent monitors every NFT for fraud patterns, keeping creators and collectors safe in the digital marketplace.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 lg:gap-12 max-w-7xl mx-auto">
            <Card variant="elevated" className="group hover:scale-105 transition-all duration-300 cursor-pointer">
              <CardHeader className="text-center">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center mb-6 mx-auto group-hover:scale-110 transition-transform duration-300">
                  <span className="text-4xl">🛡️</span>
                </div>
                <CardTitle className="text-2xl mb-4 font-bold">AI Fraud Detection</CardTitle>
                <CardDescription className="text-lg text-[var(--text-secondary)] leading-relaxed">
                  Real-time AI analysis detects plagiarism, suspicious patterns, and potential scams
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <Badge variant="safe" className="mb-4 text-sm px-3 py-1">95% Accuracy</Badge>
                <p className="text-[var(--text-muted)] leading-relaxed">
                  Our AI has prevented over $2M in potential fraud losses for our community
                </p>
              </CardContent>
            </Card>

            <Card variant="elevated" className="group hover:scale-105 transition-all duration-300 cursor-pointer">
              <CardHeader className="text-center">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center mb-6 mx-auto group-hover:scale-110 transition-transform duration-300">
                  <span className="text-4xl">⚡</span>
                </div>
                <CardTitle className="text-2xl mb-4 font-bold">Secure Trading</CardTitle>
                <CardDescription className="text-lg text-[var(--text-secondary)] leading-relaxed">
                  Built on Sui blockchain for lightning-fast, secure, and transparent transactions
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <Badge variant="info" className="mb-4 text-sm px-3 py-1">Sui Network</Badge>
                <p className="text-[var(--text-muted)] leading-relaxed">
                  Sub-second finality with minimal gas fees and enterprise-grade security
                </p>
              </CardContent>
            </Card>

            <Card variant="elevated" className="group hover:scale-105 transition-all duration-300 cursor-pointer">
              <CardHeader className="text-center">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mb-6 mx-auto group-hover:scale-110 transition-transform duration-300">
                  <span className="text-4xl">🎨</span>
                </div>
                <CardTitle className="text-2xl mb-4 font-bold">Creator Protection</CardTitle>
                <CardDescription className="text-lg text-[var(--text-secondary)] leading-relaxed">
                  Protect your original work from theft, plagiarism, and unauthorized copying
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <Badge variant="warning" className="mb-4 text-sm px-3 py-1">24/7 Monitoring</Badge>
                <p className="text-[var(--text-muted)] leading-relaxed">
                  Automatic flagging of suspicious NFT similarities and copyright violations
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}

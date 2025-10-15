import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import Footer from "@/components/Footer";
import Header from "@/components/Header";

const TermsOfService = () => {
  return (
    <>
      <Header />
      <div className="min-h-screen bg-background text-foreground pt-20">
        <div className="container px-4 py-8">
          <Link to="/">
            <Button variant="ghost" className="mb-8">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </Link>

        <div className="max-w-[900px] mx-auto">
          <h1 className="text-4xl font-bold mb-4">Terms of Service</h1>
          <p className="text-muted-foreground mb-8">
            Effective Date: October 15, 2025<br />
            Last Updated: October 15, 2025
          </p>

          <div className="prose prose-invert max-w-none space-y-8">
            <p className="text-base leading-relaxed">
              Welcome to RealtyLeadsAI ("we," "us," or "our"). These Terms of Service ("Terms") govern your access to and use of our website at realtyleadsai.com and our lead generation services (collectively, the "Services").
            </p>
            <p className="text-base leading-relaxed">
              By accessing or using our Services, you agree to be bound by these Terms. If you do not agree to these Terms, do not use our Services.
            </p>

            <section>
              <h2 className="text-2xl font-semibold mb-4">1. SERVICES DESCRIPTION</h2>
              <p className="text-base leading-relaxed mb-4">
                RealtyLeadsAI provides verified For Sale By Owner (FSBO) lead data to real estate professionals. We scrape publicly available information, verify contact details, and deliver organized lead lists via Google Sheets within 24 hours of purchase.
              </p>
              <p className="text-base leading-relaxed mb-2">Our Services include:</p>
              <ul className="list-disc pl-6 space-y-2 text-base leading-relaxed">
                <li>Verified FSBO seller contact information (names, phone numbers, addresses)</li>
                <li>City-specific lead targeting</li>
                <li>Multiple delivery tiers (Starter, Growth, Pro, Enterprise)</li>
                <li>One-time purchases and monthly subscription options</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">2. ELIGIBILITY</h2>
              <p className="text-base leading-relaxed">
                You must be at least 18 years old and a licensed real estate professional (or working under the supervision of one) to use our Services. By using our Services, you represent and warrant that you meet these requirements.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">3. ACCOUNT REGISTRATION</h2>
              <p className="text-base leading-relaxed mb-2">To purchase our Services, you may need to create an account. You agree to:</p>
              <ul className="list-disc pl-6 space-y-2 text-base leading-relaxed">
                <li>Provide accurate, current, and complete information</li>
                <li>Maintain the security of your account credentials</li>
                <li>Notify us immediately of any unauthorized access</li>
                <li>Accept responsibility for all activities under your account</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">4. PAYMENT AND BILLING</h2>
              <h3 className="text-xl font-semibold mb-3">4.1 Pricing</h3>
              <p className="text-base leading-relaxed mb-4">
                All prices are listed in USD and are subject to change. Current pricing is displayed on our website.
              </p>
              <h3 className="text-xl font-semibold mb-3">4.2 Payment Methods</h3>
              <p className="text-base leading-relaxed mb-4">
                We accept payment via credit card, debit card, and other payment methods processed through Stripe.
              </p>
              <h3 className="text-xl font-semibold mb-3">4.3 Subscription Plans</h3>
              <p className="text-base leading-relaxed mb-4">
                Monthly subscription plans automatically renew unless canceled. You will be charged on the same day each month until you cancel.
              </p>
              <h3 className="text-xl font-semibold mb-3">4.4 One-Time Purchases</h3>
              <p className="text-base leading-relaxed mb-4">
                One-time purchases are single, non-recurring payments for a specified number of leads.
              </p>
              <h3 className="text-xl font-semibold mb-3">4.5 Taxes</h3>
              <p className="text-base leading-relaxed">
                Prices do not include applicable taxes. You are responsible for all sales, use, and similar taxes.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">5. NO REFUNDS POLICY</h2>
              <p className="text-base leading-relaxed mb-4 font-semibold">
                ALL SALES ARE FINAL. We do not offer refunds after leads are delivered.
              </p>
              <p className="text-base leading-relaxed mb-4">
                Here's why: Our Services provide verified, time-sensitive FSBO data delivered within 24 hours. Once you receive your lead list, you have immediate access to contact homeowners. The value of our service is in the speed, accuracy, and verification of contact information—we cannot "un-deliver" data you have already received.
              </p>
              <p className="text-base leading-relaxed mb-4 font-semibold">
                IMPORTANT: We guarantee verified contact information (phone numbers, addresses, names), NOT conversion rates or listing success. Your success depends on your sales skills, timing, market conditions, and the homeowner's readiness to sell.
              </p>
              <p className="text-base leading-relaxed">
                If you receive leads with incorrect or invalid contact information, we will replace those specific leads with verified alternatives at no additional cost. To request replacements, contact us within 7 days of delivery with documentation of the invalid data.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">6. LEAD EXCLUSIVITY AND USAGE</h2>
              <h3 className="text-xl font-semibold mb-3">6.1 Non-Exclusive Leads</h3>
              <p className="text-base leading-relaxed mb-4">
                Unless explicitly stated otherwise, all leads are NON-EXCLUSIVE. Multiple real estate agents may purchase and receive the same leads.
              </p>
              <p className="text-base leading-relaxed mb-4">
                This mirrors standard real estate practice: when a homeowner sells their property, multiple agents typically compete for the listing. Speed, communication skills, and market knowledge determine who wins the business—not exclusive access to the lead.
              </p>
              <h3 className="text-xl font-semibold mb-3">6.2 First-Come, First-Served</h3>
              <p className="text-base leading-relaxed mb-4">
                The agent who contacts the homeowner first has the competitive advantage. We encourage prompt follow-up.
              </p>
              <h3 className="text-xl font-semibold mb-3">6.3 Permitted Use</h3>
              <p className="text-base leading-relaxed mb-2">You may use the leads to:</p>
              <ul className="list-disc pl-6 space-y-2 text-base leading-relaxed mb-4">
                <li>Contact homeowners directly</li>
                <li>Market your real estate services</li>
                <li>Conduct business in accordance with real estate regulations</li>
              </ul>
              <h3 className="text-xl font-semibold mb-3">6.4 Prohibited Use</h3>
              <p className="text-base leading-relaxed mb-2">You may NOT:</p>
              <ul className="list-disc pl-6 space-y-2 text-base leading-relaxed mb-4">
                <li>Resell, redistribute, or share leads with other agents or third parties</li>
                <li>Use leads for any illegal or fraudulent purposes</li>
                <li>Spam, harass, or violate do-not-call regulations</li>
                <li>Scrape, copy, or reproduce our website or data delivery systems</li>
              </ul>
              <p className="text-base leading-relaxed">
                Violation of these terms may result in immediate account termination without refund.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">7. DATA ACCURACY AND DISCLAIMERS</h2>
              <h3 className="text-xl font-semibold mb-3">7.1 Data Verification</h3>
              <p className="text-base leading-relaxed mb-4">
                We verify all contact information before delivery using multiple data sources. However, homeowner information can change rapidly (phone numbers disconnected, properties sold, etc.).
              </p>
              <h3 className="text-xl font-semibold mb-3">7.2 No Guarantee of Results</h3>
              <p className="text-base leading-relaxed mb-2">We provide DATA, not RESULTS. We do not guarantee:</p>
              <ul className="list-disc pl-6 space-y-2 text-base leading-relaxed mb-4">
                <li>That homeowners will respond to your outreach</li>
                <li>That properties are still available for sale</li>
                <li>That you will secure listings or earn commissions</li>
                <li>Specific conversion rates or ROI</li>
              </ul>
              <p className="text-base leading-relaxed mb-4">
                Your success depends on factors outside our control, including your sales ability, market conditions, timing, and competition.
              </p>
              <h3 className="text-xl font-semibold mb-3">7.3 Public Data Sources</h3>
              <p className="text-base leading-relaxed">
                All lead data is sourced from publicly available information (online listings, public records, etc.). We do not access private or proprietary databases.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">8. CANCELLATION AND TERMINATION</h2>
              <h3 className="text-xl font-semibold mb-3">8.1 Subscription Cancellations</h3>
              <p className="text-base leading-relaxed mb-4">
                You may cancel your monthly subscription at any time for any reason through your account dashboard or by contacting hello@realtyleadsai.com. Cancellations take effect at the end of your current billing cycle. You will not be charged for subsequent months.
              </p>
              <p className="text-base leading-relaxed mb-4">
                No refunds are provided for partial months or unused leads from the current billing period.
              </p>
              <h3 className="text-xl font-semibold mb-3">8.2 Termination by Us</h3>
              <p className="text-base leading-relaxed mb-2">We reserve the right to suspend or terminate your account if you:</p>
              <ul className="list-disc pl-6 space-y-2 text-base leading-relaxed mb-4">
                <li>Violate these Terms</li>
                <li>Engage in fraudulent activity</li>
                <li>Abuse our Services or support team</li>
                <li>Fail to pay amounts owed</li>
              </ul>
              <h3 className="text-xl font-semibold mb-3">8.3 Effect of Termination</h3>
              <p className="text-base leading-relaxed">
                Upon termination, you lose access to your account and any unused leads. Previously delivered leads remain yours to use in accordance with these Terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">9. INTELLECTUAL PROPERTY</h2>
              <h3 className="text-xl font-semibold mb-3">9.1 Our Property</h3>
              <p className="text-base leading-relaxed mb-4">
                The RealtyLeadsAI name, logo, website design, software, and all content (excluding lead data) are owned by us and protected by copyright, trademark, and other intellectual property laws.
              </p>
              <h3 className="text-xl font-semibold mb-3">9.2 Your License</h3>
              <p className="text-base leading-relaxed mb-4">
                We grant you a limited, non-exclusive, non-transferable license to access and use our Services for business purposes in accordance with these Terms.
              </p>
              <h3 className="text-xl font-semibold mb-3">9.3 Lead Data Ownership</h3>
              <p className="text-base leading-relaxed">
                Once delivered, lead data becomes your property to use for your real estate business. You may not resell or redistribute this data.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">10. LIMITATION OF LIABILITY</h2>
              <p className="text-base leading-relaxed mb-4 font-semibold">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW:
              </p>
              <p className="text-base leading-relaxed mb-2">
                RealtyLeadsAI, its officers, directors, employees, and affiliates SHALL NOT BE LIABLE for any indirect, incidental, special, consequential, or punitive damages, including lost profits, lost revenue, lost data, or business interruption arising from:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-base leading-relaxed mb-4">
                <li>Your use or inability to use our Services</li>
                <li>The quality, accuracy, or timeliness of lead data</li>
                <li>Your failure to secure listings or earn commissions</li>
                <li>Any third-party conduct or content</li>
              </ul>
              <p className="text-base leading-relaxed">
                OUR TOTAL LIABILITY to you for any claims arising from these Terms or our Services shall not exceed the amount you paid us in the 12 months preceding the claim.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">11. INDEMNIFICATION</h2>
              <p className="text-base leading-relaxed mb-2">
                You agree to indemnify, defend, and hold harmless RealtyLeadsAI and its affiliates from any claims, damages, losses, liabilities, and expenses (including legal fees) arising from:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-base leading-relaxed">
                <li>Your use of our Services</li>
                <li>Your violation of these Terms</li>
                <li>Your violation of any laws or regulations</li>
                <li>Your violation of any third-party rights</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">12. COMPLIANCE WITH LAWS</h2>
              <p className="text-base leading-relaxed mb-2">
                You agree to comply with all applicable laws and regulations, including:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-base leading-relaxed mb-4">
                <li>Telephone Consumer Protection Act (TCPA)</li>
                <li>CAN-SPAM Act</li>
                <li>Do Not Call Registry requirements</li>
                <li>State and federal real estate regulations</li>
                <li>Fair Housing Act</li>
              </ul>
              <p className="text-base leading-relaxed">
                You are solely responsible for ensuring your use of leads complies with all applicable laws.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">13. PRIVACY</h2>
              <p className="text-base leading-relaxed">
                Your use of our Services is subject to our Privacy Policy, available at realtyleadsai.com/privacy-policy. By using our Services, you consent to our collection and use of your information as described in the Privacy Policy.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">14. MODIFICATIONS TO TERMS</h2>
              <p className="text-base leading-relaxed">
                We reserve the right to modify these Terms at any time. We will notify you of material changes by email or prominent notice on our website. Your continued use of our Services after changes take effect constitutes acceptance of the modified Terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">15. DISPUTE RESOLUTION</h2>
              <h3 className="text-xl font-semibold mb-3">15.1 Governing Law</h3>
              <p className="text-base leading-relaxed mb-4">
                These Terms are governed by the laws of the State of Michigan, United States, without regard to conflict of law principles.
              </p>
              <h3 className="text-xl font-semibold mb-3">15.2 Informal Resolution</h3>
              <p className="text-base leading-relaxed mb-4">
                Before filing any legal action, you agree to contact us at hello@realtyleadsai.com to attempt to resolve the dispute informally.
              </p>
              <h3 className="text-xl font-semibold mb-3">15.3 Arbitration</h3>
              <p className="text-base leading-relaxed mb-4">
                Any disputes that cannot be resolved informally shall be resolved through binding arbitration in accordance with the rules of the American Arbitration Association. Arbitration shall take place in Michigan.
              </p>
              <h3 className="text-xl font-semibold mb-3">15.4 Class Action Waiver</h3>
              <p className="text-base leading-relaxed">
                You agree to resolve disputes on an individual basis only. You waive any right to participate in class actions or class-wide arbitration.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">16. GENERAL PROVISIONS</h2>
              <h3 className="text-xl font-semibold mb-3">16.1 Entire Agreement</h3>
              <p className="text-base leading-relaxed mb-4">
                These Terms constitute the entire agreement between you and RealtyLeadsAI regarding our Services.
              </p>
              <h3 className="text-xl font-semibold mb-3">16.2 Severability</h3>
              <p className="text-base leading-relaxed mb-4">
                If any provision of these Terms is found unenforceable, the remaining provisions remain in full effect.
              </p>
              <h3 className="text-xl font-semibold mb-3">16.3 No Waiver</h3>
              <p className="text-base leading-relaxed mb-4">
                Our failure to enforce any provision does not constitute a waiver of that provision.
              </p>
              <h3 className="text-xl font-semibold mb-3">16.4 Assignment</h3>
              <p className="text-base leading-relaxed mb-4">
                You may not assign these Terms without our written consent. We may assign these Terms at any time.
              </p>
              <h3 className="text-xl font-semibold mb-3">16.5 Contact Information</h3>
              <p className="text-base leading-relaxed mb-2">For questions about these Terms, contact us at:</p>
              <p className="text-base leading-relaxed">
                RealtyLeadsAI<br />
                hello@realtyleadsai.com
              </p>
            </section>

            <section className="border-t border-border pt-8">
              <p className="text-base leading-relaxed font-semibold">
                By using RealtyLeadsAI, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
              </p>
            </section>
          </div>
        </div>
      </div>
      <Footer />
      </div>
    </>
  );
};

export default TermsOfService;

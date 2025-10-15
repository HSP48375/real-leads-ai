import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";

const PrivacyPolicy = () => {
  return (
    <>
      <Header />
      <div className="min-h-screen bg-background pt-20">
        {/* Header */}
        <header className="border-b border-border py-6">
          <div className="container px-4">
            <Link to="/">
              <Button variant="ghost" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back to Home
              </Button>
            </Link>
          </div>
        </header>

      {/* Content */}
      <main className="py-12 md:py-20">
        <article className="container px-4 max-w-[900px] mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Privacy Policy</h1>
          <p className="text-muted-foreground mb-12">Last updated: October 15, 2025</p>

          <div className="prose prose-invert max-w-none space-y-8 text-foreground leading-relaxed text-base md:text-lg">
            <section>
              <p>
                Your privacy is important to us. It is RealtyLeadsAI's policy to respect your privacy and comply with any applicable law and regulation regarding any personal information we may collect about you, including across our website, RealtyLeads.AI, and other sites we own and operate.
              </p>
              <p>
                Personal information is any information about you which can be used to identify you. This includes information about you as a person (such as name, address, and date of birth), your devices, payment details, and even information about how you use a website or online service.
              </p>
              <p>
                In the event our site contains links to third-party sites and services, please be aware that those sites and services have their own privacy policies. After following a link to any third-party content, you should read their posted privacy policy information about how they collect and use personal information. This Privacy Policy does not apply to any of your activities after you leave our site.
              </p>
              <p className="font-semibold">This policy is effective as of October 15, 2025</p>
            </section>

            <section>
              <h2 className="text-2xl md:text-3xl font-bold mb-4">Information We Collect</h2>
              <p>
                Information we collect falls into one of two categories: "voluntarily provided" information and "automatically collected" information.
              </p>
              <p>
                "Voluntarily provided" information refers to any information you knowingly and actively provide us when using or participating in any of our services and promotions.
              </p>
              <p>
                "Automatically collected" information refers to any information automatically sent by your devices in the course of accessing our products and services.
              </p>
            </section>

            <section>
              <h3 className="text-xl md:text-2xl font-bold mb-4">Log Data</h3>
              <p>
                When you visit our website, our servers may automatically log the standard data provided by your web browser. It may include your device's Internet Protocol (IP) address, your browser type and version, the pages you visit, the time and date of your visit, the time spent on each page, and other details about your visit.
              </p>
              <p>
                Additionally, if you encounter certain errors while using the site, we may automatically collect data about the error and the circumstances surrounding its occurrence. This data may include technical details about your device, what you were trying to do when the error happened, and other technical information relating to the problem. You may or may not receive notice of such errors, even in the moment they occur, that they have occurred, or what the nature of the error is.
              </p>
              <p>
                Please be aware that while this information may not be personally identifying by itself, it may be possible to combine it with other data to personally identify individual persons.
              </p>
            </section>

            <section>
              <h3 className="text-xl md:text-2xl font-bold mb-4">Personal Information</h3>
              <p>
                We may ask for personal information - for example, when you submit content to us, when you participate in any of our giveaways, sweepstakes, or promotions or when you contact us — which may include one or more of the following:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Name</li>
                <li>Email</li>
                <li>Phone/mobile number</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl md:text-3xl font-bold mb-4">Legitimate Reasons for Processing Your Personal Information</h2>
              <p>
                We only collect and use your personal information when we have a legitimate reason for doing so. In which instance, we only collect personal information that is reasonably necessary to provide our services to you.
              </p>
            </section>

            <section>
              <h2 className="text-2xl md:text-3xl font-bold mb-4">Collection and Use of Information</h2>
              <p>We may collect personal information from you when you do any of the following on our website:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Enter any of our competitions, contests, sweepstakes, and surveys</li>
                <li>Use a mobile device or web browser to access our content</li>
                <li>Contact us via email, social media, or on any similar technologies</li>
                <li>When you mention us on social media</li>
              </ul>
              <p className="mt-4">
                We may collect, hold, use, and disclose information for the following purposes, and personal information will not be further processed in a manner that is incompatible with these purposes:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>to provide you with our platform's core features and services</li>
                <li>to deliver products and/or services to you</li>
                <li>to contact and communicate with you</li>
                <li>for analytics, market research, and business development, including to operate and improve our website, associated applications, and associated social media platforms</li>
                <li>to send you marketing and promotional communications. To opt out of these communications, please see "Your rights and controlling your personal information"</li>
                <li>to deliver you personalized and targeted advertising tailored to your interests</li>
                <li>for internal record keeping and administrative purposes</li>
                <li>to run competitions, sweepstakes, and/or offer additional benefits to you</li>
              </ul>
              <p className="mt-4">
                We may combine voluntarily provided and automatically collected personal information with general information or research data we receive from other trusted sources. For example, Our marketing and market research activities may uncover data and insights, which we may combine with information about how visitors use our site to improve our site and your experience on it.
              </p>
            </section>

            <section>
              <h2 className="text-2xl md:text-3xl font-bold mb-4">Security of Your Personal Information</h2>
              <p>
                When we collect and process personal information, and while we retain this information, we will protect it within commercially acceptable means to prevent loss and theft, as well as unauthorised access, disclosure, copying, use or modification.
              </p>
              <p>
                Although we will do our best to protect the personal information you provide to us, we advise that no method of electronic transmission or storage is 100% secure and no one can guarantee absolute data security.
              </p>
              <p>
                You are responsible for selecting any password and its overall security strength, ensuring the security of your own information within the bounds of our services. For example, ensuring you do not make your personal information publicly available via our platform.
              </p>
            </section>

            <section>
              <h2 className="text-2xl md:text-3xl font-bold mb-4">How Long We Keep Your Personal Information</h2>
              <p>
                We keep your personal information only for as long as we need to. This time period may depend on what we are using your information for, in accordance with this privacy policy. For example, if you have provided us with personal information such as an email address when contacting us about a specific enquiry, we may retain this information for the duration of your enquiry remaining open as well as for our own records so we may effectively address similar enquiries in future. If your personal information is no longer required for this purpose, we will delete it or make it anonymous by removing all details that identify you.
              </p>
              <p>
                However, if necessary, we may retain your personal information for our compliance with a legal, accounting, or reporting obligation or for archiving purposes in the public interest, scientific, or historical research purposes or statistical purposes.
              </p>
            </section>

            <section>
              <h2 className="text-2xl md:text-3xl font-bold mb-4">Children's Privacy</h2>
              <p>
                We do not aim any of our products or services directly at children under the age of 13 and we do not knowingly collect personal information about children under 13.
              </p>
            </section>

            <section>
              <h2 className="text-2xl md:text-3xl font-bold mb-4">Disclosure of Personal Information to Third Parties</h2>
              <p>We may disclose personal information to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>a parent, subsidiary or affiliate of our company</li>
                <li>third-party service providers for the purpose of enabling them to provide their services, including (without limitation) IT service providers, data storage, hosting and server providers, ad networks, analytics, error loggers, debt collectors, maintenance or problem-solving providers, advertising providers, professional advisors, and payment systems operators</li>
                <li>our employees, contractors, and/or related entities</li>
                <li>our existing or potential agents or business partners</li>
                <li>sponsors or promoters of any competition, sweepstakes, or promotion we run</li>
                <li>credit reporting agencies, courts, tribunals, and regulatory authorities, in the event you fail to pay for goods or services we have provided to you</li>
                <li>courts, tribunals, regulatory authorities, and law enforcement officers, as required by law, in connection with any actual or prospective legal proceedings, or in order to establish, exercise, or defend our legal rights</li>
                <li>third parties, including agents or sub-contractors who assist us in providing information, products, services, or direct marketing to you</li>
                <li>third parties to collect and process data</li>
                <li>an entity that buys, or to which we transfer all or substantially all of our assets and business</li>
              </ul>
              <p className="mt-4 font-semibold">Third parties we currently use include:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Google Analytics</li>
                <li>Google AdSense</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl md:text-3xl font-bold mb-4">Your Rights and Controlling Your Personal Information</h2>
              <p>
                <strong>Your choice:</strong> By providing personal information to us, you understand we will collect, hold, use, and disclose your personal information in accordance with this privacy policy. You do not have to provide personal information to us, however, if you do not, it may affect your use of our website or the products and/or services offered on or through it.
              </p>
              <p>
                <strong>Information from third parties:</strong> If we receive personal information about you from a third party, we will protect it as set out in this privacy policy. If you are a third party providing personal information about somebody else, you represent and warrant that you have such person's consent to provide the personal information to us.
              </p>
              <p>
                <strong>Marketing permission:</strong> If you have previously agreed to us using your personal information for direct marketing purposes, you may change your mind at any time by contacting us using the details below.
              </p>
              <p>
                <strong>Access:</strong> You may request details of the personal information that we hold about you.
              </p>
              <p>
                <strong>Correction:</strong> If you believe that any information we hold about you is inaccurate, out of date, incomplete, irrelevant, or misleading, please contact us using the details provided in this privacy policy. We will take reasonable steps to correct any information found to be inaccurate, incomplete, misleading, or out of date.
              </p>
              <p>
                <strong>Non-discrimination:</strong> We will not discriminate against you for exercising any of your rights over your personal information. Unless your personal information is required to provide you with a particular service or offer (for example providing user support), we will not deny you goods or services and/or charge you different prices or rates for goods or services, including through granting discounts or other benefits, or imposing penalties, or provide you with a different level or quality of goods or services.
              </p>
              <p>
                <strong>Notification of data breaches:</strong> We will comply with laws applicable to us in respect of any data breach.
              </p>
              <p>
                <strong>Complaints:</strong> If you believe that we have breached a relevant data protection law and wish to make a complaint, please contact us using the details below and provide us with full details of the alleged breach. We will promptly investigate your complaint and respond to you, in writing, setting out the outcome of our investigation and the steps we will take to deal with your complaint. You also have the right to contact a regulatory body or data protection authority in relation to your complaint.
              </p>
              <p>
                <strong>Opt out of communications:</strong> You may opt out of receiving communications from us, including marketing and promotional messages, at any time. To do so, use the opt-out facilities provided in the communication. For example, you can click the "unsubscribe" link included in any marketing email we send you, reply "STOP" or "UNSUBSCRIBE" to any SMS messages we send you, or contact us directly using the contact information provided in this privacy policy. In certain cases, we may request additional information to verify your identity before processing your opt-out request.
              </p>
              <p>
                Please be aware that even if you opt out of communications, we may still contact you when necessary for non-promotional purposes, including, but not limited to, managing your account, responding to service inquiries, or providing important updates related to your use of our services.
              </p>
            </section>

            <section>
              <h2 className="text-2xl md:text-3xl font-bold mb-4">Business Transfers</h2>
              <p>
                If we or our assets are acquired, or in the unlikely event that we go out of business or enter bankruptcy, we would include data, including your personal information, among the assets transferred to any parties who acquire us. You acknowledge that such transfers may occur, and that any parties who acquire us may, to the extent permitted by applicable law, continue to use your personal information according to this policy, which they will be required to assume as it is the basis for any ownership or use rights we have over such information.
              </p>
            </section>

            <section>
              <h2 className="text-2xl md:text-3xl font-bold mb-4">Limits of Our Policy</h2>
              <p>
                Our website may link to external sites that are not operated by us. Please be aware that we have no control over the content and policies of those sites, and cannot accept responsibility or liability for their respective privacy practices.
              </p>
            </section>

            <section>
              <h2 className="text-2xl md:text-3xl font-bold mb-4">Changes to This Policy</h2>
              <p>
                At our discretion, we may change our privacy policy to reflect updates to our business processes, current acceptable practices, or legislative or regulatory changes. If we decide to change this privacy policy, we will post the changes here at the same link by which you are accessing this privacy policy.
              </p>
              <p>
                If required by law, we will get your permission or give you the opportunity to opt in to or opt out of, as applicable, any new uses of your personal information.
              </p>
            </section>

            <section>
              <h2 className="text-2xl md:text-3xl font-bold mb-4">Additional Disclosures for U.S. States Privacy Law Compliance</h2>
              <p>
                The following section includes provisions that comply with the privacy laws of these states (California, Colorado, Delaware, Florida, Virginia, and Utah) and is applicable only to the residents of those states. Specific references to a particular state (in a heading or in the text) are only a reference to that state's law and applies only to that state's residents. Non-state specific language applies to all of the states listed above.
              </p>
            </section>

            <section>
              <h3 className="text-xl md:text-2xl font-bold mb-4">Do Not Track</h3>
              <p>
                Some browsers have a "Do Not Track" feature that lets you tell websites that you do not want to have your online activities tracked. At this time, we do not respond to browser "Do Not Track" signals.
              </p>
              <p>
                We adhere to the standards outlined in this privacy policy, ensuring we collect and process personal information lawfully, fairly, transparently, and with legitimate, legal reasons for doing so.
              </p>
            </section>

            <section>
              <h3 className="text-xl md:text-2xl font-bold mb-4">California Privacy Laws - CPPA</h3>
              <p>
                Under California Civil Code Section 1798.83, if you live in California and your business relationship with us is mainly for personal, family, or household purposes, you may ask us about the information we release to other organizations for their marketing purposes. In accordance with your right to non-discrimination, we may offer you certain financial incentives permitted by the California Consumer Privacy Act, and the California Privacy Rights Act (collectively, CCPA) that can result in different prices, rates, or quality levels for the goods or services we provide. Any CCPA-permitted financial incentive we offer will reasonably relate to the value of your personal information, and we will provide written terms that describe clearly the nature of such an offer. Participation in a financial incentive program requires your prior opt-in consent, which you may revoke at any time.
              </p>
              <p>
                Under California Civil Code Section 1798.83, if you live in California and your business relationship with us is mainly for personal, family, or household purposes, you may ask us about the information we release to other organizations for their marketing purposes. To make such a request, please contact us using the details provided in this privacy policy with "Request for California privacy information" in the subject line. You may make this type of request once every calendar year. We will email you a list of categories of personal information we revealed to other organisations for their marketing purposes in the last calendar year, along with their names and addresses. Not all personal information shared in this way is covered by Section 1798.83 of the California Civil Code.
              </p>
            </section>

            <section>
              <h3 className="text-xl md:text-2xl font-bold mb-4">California Notice of Collection</h3>
              <p>
                In the past 12 months, we have collected the following categories of personal information enumerated in the CCPA:
              </p>
              <p>
                For more information on information we collect, including the sources we receive information from, review the "Information We Collect" section. We collect and use these categories of personal information for the business purposes described in the "Collection and Use of Information" section, including to provide and manage our Service.
              </p>
            </section>

            <section>
              <h3 className="text-xl md:text-2xl font-bold mb-4">Right to Know and Delete</h3>
              <p>
                You have rights to delete your personal information we collected and know certain information about our data practices in the preceding 12 months. In particular, you have the right to request the following from us:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>The categories of personal information we have collected about you;</li>
                <li>The categories of sources from which the personal information was collected;</li>
                <li>The categories of personal information about you we disclosed for a business purpose or sold;</li>
                <li>The categories of third parties to whom the personal information was disclosed for a business purpose or sold;</li>
                <li>The business or commercial purpose for collecting or selling the personal information; and</li>
                <li>The specific pieces of personal information we have collected about you.</li>
              </ul>
              <p className="mt-4">
                To exercise any of these rights, please contact us using the details provided in this privacy policy.
              </p>
            </section>

            <section>
              <h3 className="text-xl md:text-2xl font-bold mb-4">Shine the Light</h3>
              <p>
                In addition to the rights discussed above, you have the right to request information from us regarding the manner in which we share certain personal information as defined by applicable statute with third parties and affiliates for their own direct marketing purposes.
              </p>
              <p>
                To receive this information, send us a request using the contact details provided in this privacy policy. Requests must include "Privacy Rights Request" in the first line of the description and include your name, street address, city, state, and ZIP code.
              </p>
            </section>

            <section>
              <h2 className="text-2xl md:text-3xl font-bold mb-4">Contact Us</h2>
              <p>
                For any questions or concerns regarding your privacy, you may contact us using the following details:
              </p>
              <p className="font-semibold mt-4">RealtyLeads AI</p>
              <p>
                <a href="mailto:Hello@RealtyLeads.ai" className="text-primary hover:underline">
                  Hello@RealtyLeads.ai
                </a>
              </p>
              <p className="text-sm text-muted-foreground mt-4">
                This privacy policy was created using the GetTerms Privacy Policy Generator
              </p>
            </section>
          </div>
        </article>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container px-4 text-center text-sm text-muted-foreground">
          <p>© 2025 RealtyLeadsAI. All rights reserved.</p>
        </div>
      </footer>
    </div>
    </>
  );
};

export default PrivacyPolicy;

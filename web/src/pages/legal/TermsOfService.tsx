import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const TermsOfService = () => {
  return (
    <div className="min-h-screen page-background p-4 py-12">
      <div className="w-full max-w-3xl mx-auto">
        <div className="mb-6">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/login">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Login
            </Link>
          </Button>
        </div>

        <div className="text-center mb-8">
          <div className="w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <img
              src="/logo-design.png"
              alt="homm console"
              className="w-16 h-16 object-contain"
            />
          </div>
          <h1 className="text-3xl font-bold text-primary">Heritage - Member Management Console</h1>
        </div>

        <Card className="glass-card shadow-lg border-0">
          <CardHeader>
            <CardTitle className="text-2xl">Terms of Service</CardTitle>
            <p className="text-sm text-muted-foreground">Last updated: August 31, 2026</p>
          </CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert max-w-none space-y-6">
            <section>
              <h3 className="text-lg font-semibold">1. Acceptance of Terms</h3>
              <p className="text-muted-foreground leading-relaxed">
                By accessing or using Heritage - Member Management Console ("the Platform"), operated by Heritage of Faith Church ("we", "us", or "our"),
                you agree to be bound by these Terms of Service. If you do not agree to these terms,
                please do not use the Platform.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold">2. Description of Service</h3>
              <p className="text-muted-foreground leading-relaxed">
                Heritage - Member Management Console is a church management platform that provides tools for member management,
                soul registration, follow-up tracking, team coordination, transport logistics, and
                related church administrative functions. The Platform is intended for use by authorized
                members and administrators of participating churches.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold">3. User Accounts</h3>
              <p className="text-muted-foreground leading-relaxed">
                Access to the Platform requires authentication via Google Sign-In. By signing in, you confirm that:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>You are authorized by your church to use the Platform.</li>
                <li>The information you provide is accurate and current.</li>
                <li>You will not share your account access with unauthorized individuals.</li>
                <li>You are responsible for all activity that occurs under your account.</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold">4. Use of Google Services</h3>
              <p className="text-muted-foreground leading-relaxed">
                The Platform uses Google OAuth for authentication. By using the Platform, you also agree to
                comply with Google's Terms of Service. We access your Google account only to obtain your
                email address and basic profile information for authentication purposes.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold">5. Acceptable Use</h3>
              <p className="text-muted-foreground leading-relaxed">You agree not to:</p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>Use the Platform for any unlawful purpose or in violation of any applicable laws.</li>
                <li>Attempt to gain unauthorized access to any part of the Platform or its systems.</li>
                <li>Interfere with or disrupt the Platform's functionality or security.</li>
                <li>Upload or transmit malicious code, viruses, or harmful data.</li>
                <li>Collect or harvest personal data of other users without authorization.</li>
                <li>Use the Platform in any manner that could damage, disable, or impair the service.</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold">6. Data and Privacy</h3>
              <p className="text-muted-foreground leading-relaxed">
                We collect and process personal information necessary for the operation of the Platform,
                including names, email addresses, contact details, and church membership information.
                Your data is stored securely and used solely for the purposes of church administration
                and the services provided by the Platform. We do not sell your personal information
                to third parties. For more details, please refer to our{" "}
                <Link to="/privacy-policy" className="text-primary hover:underline">Privacy Policy</Link>.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold">7. Intellectual Property</h3>
              <p className="text-muted-foreground leading-relaxed">
                All content, features, and functionality of the Platform, including but not limited to
                text, graphics, logos, and software, are the property of Heritage of Faith Church and
                are protected by applicable intellectual property laws. You may not reproduce, distribute,
                or create derivative works from any part of the Platform without our express written consent.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold">8. Disclaimer of Warranties</h3>
              <p className="text-muted-foreground leading-relaxed">
                The Platform is provided on an "as is" and "as available" basis without warranties of any kind,
                either express or implied. We do not warrant that the Platform will be uninterrupted,
                error-free, or free of harmful components. Your use of the Platform is at your sole risk.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold">9. Limitation of Liability</h3>
              <p className="text-muted-foreground leading-relaxed">
                To the fullest extent permitted by law, Heritage of Faith Church shall not be liable for
                any indirect, incidental, special, consequential, or punitive damages arising out of
                or in connection with your use of the Platform, whether based on warranty, contract,
                tort, or any other legal theory.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold">10. Termination</h3>
              <p className="text-muted-foreground leading-relaxed">
                We reserve the right to suspend or terminate your access to the Platform at any time,
                with or without notice, for any reason, including but not limited to a breach of these
                Terms. Upon termination, your right to use the Platform will immediately cease.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold">11. Changes to Terms</h3>
              <p className="text-muted-foreground leading-relaxed">
                We reserve the right to modify these Terms of Service at any time. Changes will be
                effective immediately upon posting to the Platform. Your continued use of the Platform
                after any changes constitutes your acceptance of the revised terms.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold">12. Contact Information</h3>
              <p className="text-muted-foreground leading-relaxed">
                If you have any questions about these Terms of Service, please contact us through
                your church administration or via the Platform's support channels.
              </p>
            </section>
          </CardContent>
        </Card>

        <div className="text-center mt-6 text-sm text-muted-foreground">
          <Link to="/privacy-policy" className="text-primary hover:underline">Privacy Policy</Link>
          <span className="mx-2">|</span>
          <Link to="/login" className="text-primary hover:underline">Sign In</Link>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;

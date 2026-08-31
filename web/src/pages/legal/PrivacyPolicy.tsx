import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const PrivacyPolicy = () => {
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
              alt="Soul Bank Logo"
              className="w-16 h-16 object-contain"
            />
          </div>
          <h1 className="text-3xl font-bold text-primary">Soul Bank</h1>
        </div>

        <Card className="glass-card shadow-lg border-0">
          <CardHeader>
            <CardTitle className="text-2xl">Privacy Policy</CardTitle>
            <p className="text-sm text-muted-foreground">Last updated: August 31, 2026</p>
          </CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert max-w-none space-y-6">
            <section>
              <h3 className="text-lg font-semibold">1. Introduction</h3>
              <p className="text-muted-foreground leading-relaxed">
                Heritage of Faith Church ("we", "us", or "our") operates Soul Bank ("the Platform").
                This Privacy Policy explains how we collect, use, store, and protect your personal
                information when you use our Platform.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold">2. Information We Collect</h3>
              <p className="text-muted-foreground leading-relaxed">
                We collect the following types of information:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>
                  <strong>Account Information:</strong> When you sign in with Google, we receive your
                  email address, name, and profile picture from your Google account.
                </li>
                <li>
                  <strong>Church Membership Data:</strong> Information related to your church membership
                  such as your role, team assignments, and participation records.
                </li>
                <li>
                  <strong>Contact Information:</strong> Phone numbers, addresses, and other contact
                  details you provide for church communication purposes.
                </li>
                <li>
                  <strong>Usage Data:</strong> Information about how you interact with the Platform,
                  including pages visited and features used.
                </li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold">3. How We Use Your Information</h3>
              <p className="text-muted-foreground leading-relaxed">We use your information to:</p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>Authenticate your identity and provide access to the Platform.</li>
                <li>Manage church membership records and administrative functions.</li>
                <li>Facilitate follow-up activities and pastoral care.</li>
                <li>Coordinate team activities and transport logistics.</li>
                <li>Send church-related communications and notifications.</li>
                <li>Improve and maintain the Platform's functionality.</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold">4. Google User Data</h3>
              <p className="text-muted-foreground leading-relaxed">
                Our use of information received from Google APIs adheres to the{" "}
                <a
                  href="https://developers.google.com/terms/api-services-user-data-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Google API Services User Data Policy
                </a>
                , including the Limited Use requirements. We only request access to your email address
                and basic profile information. We do not:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>Transfer your Google user data to third parties unless necessary to provide or improve the service.</li>
                <li>Use your Google user data for serving advertisements.</li>
                <li>Use your Google user data for purposes unrelated to the Platform's core functionality.</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold">5. Data Sharing</h3>
              <p className="text-muted-foreground leading-relaxed">
                We do not sell, trade, or rent your personal information to third parties.
                We may share your information only in the following circumstances:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>With authorized church administrators who need access to perform their duties.</li>
                <li>With service providers who help us operate the Platform (e.g., hosting providers), under strict data protection agreements.</li>
                <li>When required by law or to protect our rights and the safety of our users.</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold">6. Data Security</h3>
              <p className="text-muted-foreground leading-relaxed">
                We implement appropriate technical and organizational measures to protect your personal
                information against unauthorized access, alteration, disclosure, or destruction. This
                includes encryption of data in transit, secure authentication via Google OAuth, and
                access controls based on user roles.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold">7. Data Retention</h3>
              <p className="text-muted-foreground leading-relaxed">
                We retain your personal information for as long as your account is active or as needed
                to provide you with the Platform's services. If you wish to have your data removed,
                please contact your church administrator, and we will delete your information within
                a reasonable timeframe, unless we are required to retain it by law.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold">8. Your Rights</h3>
              <p className="text-muted-foreground leading-relaxed">You have the right to:</p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>Access the personal information we hold about you.</li>
                <li>Request correction of inaccurate information.</li>
                <li>Request deletion of your personal information.</li>
                <li>Withdraw your consent at any time by discontinuing use of the Platform.</li>
                <li>Revoke the Platform's access to your Google account through your Google account settings.</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold">9. Children's Privacy</h3>
              <p className="text-muted-foreground leading-relaxed">
                The Platform is not intended for use by individuals under the age of 13. We do not
                knowingly collect personal information from children under 13. If we become aware
                that we have collected personal information from a child under 13, we will take
                steps to delete such information.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold">10. Changes to This Policy</h3>
              <p className="text-muted-foreground leading-relaxed">
                We may update this Privacy Policy from time to time. Changes will be posted on this
                page with an updated revision date. Your continued use of the Platform after any
                changes constitutes your acceptance of the revised policy.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold">11. Contact Us</h3>
              <p className="text-muted-foreground leading-relaxed">
                If you have any questions about this Privacy Policy or our data practices, please
                contact us at{" "}
                <a href="mailto:josepholukayode05@gmail.com" className="text-primary hover:underline">
                  josepholukayode05@gmail.com
                </a>{" "}
                or through your church administration.
              </p>
            </section>
          </CardContent>
        </Card>

        <div className="text-center mt-6 text-sm text-muted-foreground">
          <Link to="/terms-of-service" className="text-primary hover:underline">Terms of Service</Link>
          <span className="mx-2">|</span>
          <Link to="/login" className="text-primary hover:underline">Sign In</Link>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;

import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import ScreenWrapper from '../components/ScreenWrapper';
import { Colors, Spacing, Typography } from '../constants/DesignTokens';

export default function PrivacyPolicyScreen() {
  return (
    <ScreenWrapper title="Privacy Policy" showBackButton>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={styles.heading}>Privacy Policy</Text>
          <Text style={styles.paragraph}>
            This privacy policy applies to the Skyline app (hereby referred to as &quot;Application&quot;) for
            mobile devices that was created by Boris Plesnicar (hereby referred to as &quot;Service Provider&quot;)
            as a Free service. This service is intended for use &quot;AS IS&quot;.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.subheading}>Information Collection and Use</Text>
          <Text style={styles.paragraph}>
            The Application collects information when you download and use it. This information may include
            information such as:
          </Text>
          <Text style={styles.listItem}>• Your device&apos;s Internet Protocol address (e.g. IP address)</Text>
          <Text style={styles.listItem}>
            • The pages of the Application that you visit, the time and date of your visit, the time spent on
            those pages
          </Text>
          <Text style={styles.listItem}>• The time spent on the Application</Text>
          <Text style={styles.listItem}>• The operating system you use on your mobile device</Text>

          <Text style={styles.paragraph}>
            The Application does not gather precise information about the location of your mobile device.
          </Text>

          <Text style={styles.paragraph}>
            The Application collects your device&apos;s location, which helps the Service Provider determine your
            approximate geographical location and make use of in below ways:
          </Text>
          <Text style={styles.listItem}>
            • Geolocation Services: The Service Provider utilizes location data to provide features such as
            personalized content, relevant recommendations, and location-based services.
          </Text>
          <Text style={styles.listItem}>
            • Analytics and Improvements: Aggregated and anonymized location data helps the Service Provider to
            analyze user behavior, identify trends, and improve the overall performance and functionality of the
            Application.
          </Text>
          <Text style={styles.listItem}>
            • Third-Party Services: Periodically, the Service Provider may transmit anonymized location data to
            external services. These services assist them in enhancing the Application and optimizing their
            offerings.
          </Text>

          <Text style={styles.paragraph}>
            The Service Provider may use the information you provided to contact you from time to time to provide
            you with important information, required notices and marketing promotions.
          </Text>

          <Text style={styles.paragraph}>
            For a better experience, while using the Application, the Service Provider may require you to provide
            them with certain personally identifiable information, including but not limited to name, email,
            userId, profile image (avatar URL), company name, company membership/role, flight dates and times,
            flight numbers, departure and arrival airports (city/country), booking reference/confirmation code,
            seat, gate, terminal, free-text notes, uploaded documents/images (e.g. boarding passes, receipts),
            travel history/statistics (number of flights, countries visited, total distance). The information
            that the Service Provider request will be retained by them and used as described in this privacy
            policy.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.subheading}>Third Party Access</Text>
          <Text style={styles.paragraph}>
            Only aggregated, anonymized data is periodically transmitted to external services to aid the Service
            Provider in improving the Application and their service. The Service Provider may share your
            information with third parties in the ways that are described in this privacy statement.
          </Text>
          <Text style={styles.paragraph}>
            Please note that the Application utilizes third-party services that have their own Privacy Policy
            about handling data. Below are the links to the Privacy Policy of the third-party service providers
            used by the Application:
          </Text>
          <Text style={styles.listItem}>• Google Play Services</Text>
          <Text style={styles.listItem}>• Google Analytics for Firebase</Text>
          <Text style={styles.listItem}>• Firebase Crashlytics</Text>
          <Text style={styles.listItem}>• Expo</Text>

          <Text style={styles.paragraph}>
            The Service Provider may disclose User Provided and Automatically Collected Information:
          </Text>
          <Text style={styles.listItem}>
            • as required by law, such as to comply with a subpoena, or similar legal process;
          </Text>
          <Text style={styles.listItem}>
            • when they believe in good faith that disclosure is necessary to protect their rights, protect your
            safety or the safety of others, investigate fraud, or respond to a government request;
          </Text>
          <Text style={styles.listItem}>
            • with their trusted services providers who work on their behalf, do not have an independent use of
            the information we disclose to them, and have agreed to adhere to the rules set forth in this privacy
            statement.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.subheading}>Opt-Out Rights</Text>
          <Text style={styles.paragraph}>
            You can stop all collection of information by the Application easily by uninstalling it. You may use
            the standard uninstall processes as may be available as part of your mobile device or via the mobile
            application marketplace or network.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.subheading}>Data Retention Policy</Text>
          <Text style={styles.paragraph}>
            The Service Provider will retain User Provided data for as long as you use the Application and for a
            reasonable time thereafter. If you would like them to delete User Provided Data that you have
            provided via the Application, please contact them at plesnicaroffice@gmail.com and they will respond
            in a reasonable time.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.subheading}>Children</Text>
          <Text style={styles.paragraph}>
            The Service Provider does not use the Application to knowingly solicit data from or market to
            children under the age of 13. The Application does not address anyone under the age of 13. The
            Service Provider does not knowingly collect personally identifiable information from children under
            13 years of age. In the case the Service Provider discover that a child under 13 has provided personal
            information, the Service Provider will immediately delete this from their servers. If you are a
            parent or guardian and you are aware that your child has provided them with personal information,
            please contact the Service Provider (plesnicaroffice@gmail.com) so that they will be able to take the
            necessary actions.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.subheading}>Security</Text>
          <Text style={styles.paragraph}>
            The Service Provider is concerned about safeguarding the confidentiality of your information. The
            Service Provider provides physical, electronic, and procedural safeguards to protect information the
            Service Provider processes and maintains.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.subheading}>Changes</Text>
          <Text style={styles.paragraph}>
            This Privacy Policy may be updated from time to time for any reason. The Service Provider will notify
            you of any changes to the Privacy Policy by updating this page with the new Privacy Policy. You are
            advised to consult this Privacy Policy regularly for any changes, as continued use is deemed approval
            of all changes.
          </Text>
          <Text style={styles.paragraph}>This privacy policy is effective as of 2026-01-21.</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.subheading}>Your Consent</Text>
          <Text style={styles.paragraph}>
            By using the Application, you are consenting to the processing of your information as set forth in
            this Privacy Policy now and as amended by the Service Provider.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.subheading}>Contact Us</Text>
          <Text style={styles.paragraph}>
            If you have any questions regarding privacy while using the Application, or have questions about the
            practices, please contact the Service Provider via email at plesnicaroffice@gmail.com.
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            This privacy policy page was generated by App Privacy Policy Generator.
          </Text>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing['4xl'],
    gap: Spacing.lg,
  },
  section: {
    gap: Spacing.sm,
  },
  heading: {
    fontSize: Typography.fontSize['2xl'],
    fontFamily: Typography.fontFamily.display,
    color: Colors.text.primary,
  },
  subheading: {
    fontSize: Typography.fontSize.lg,
    fontFamily: Typography.fontFamily.display,
    color: Colors.text.primary,
  },
  paragraph: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.text.secondary,
    lineHeight: 18,
  },
  listItem: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.text.secondary,
    lineHeight: 18,
    paddingLeft: Spacing.md,
  },
  footer: {
    marginTop: Spacing.lg,
  },
  footerText: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.text.tertiary,
  },
});


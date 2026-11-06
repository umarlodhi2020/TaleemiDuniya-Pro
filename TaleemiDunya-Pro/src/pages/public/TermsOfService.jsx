import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, BookOpen } from 'lucide-react';

const pageTitle = 'Taleemi Duniya Pro – Terms of Service';
const pageDescription = 'Read the Terms of Service governing the use of Taleemi Duniya Pro school management software and its educational services.';
const canonicalUrl = 'https://taleemidunya-pro-ed44e.web.app/terms-of-service';

const TermsOfService = () => {
  useEffect(() => {
    const previousTitle = document.title;
    const descriptionMeta = document.querySelector('meta[name="description"]');
    const previousDescription = descriptionMeta?.getAttribute('content');
    const canonicalLink = document.querySelector('link[rel="canonical"]');
    const previousCanonical = canonicalLink?.getAttribute('href');
    const addedDescription = !descriptionMeta;
    const addedCanonical = !canonicalLink;
    const description = descriptionMeta || document.createElement('meta');
    const canonical = canonicalLink || document.createElement('link');

    document.title = pageTitle;
    description.setAttribute('name', 'description');
    description.setAttribute('content', pageDescription);
    canonical.setAttribute('rel', 'canonical');
    canonical.setAttribute('href', canonicalUrl);

    if (addedDescription) document.head.appendChild(description);
    if (addedCanonical) document.head.appendChild(canonical);

    return () => {
      document.title = previousTitle;
      if (addedDescription) description.remove();
      else if (previousDescription !== null) description.setAttribute('content', previousDescription);
      if (addedCanonical) canonical.remove();
      else if (previousCanonical !== null) canonical.setAttribute('href', previousCanonical);
    };
  }, []);

  return (
    <div className="terms-of-service-page min-h-screen bg-white font-sans text-gray-800">
      <style>{`
        .terms-of-service-page { color-scheme: light; }
        @media print {
          .terms-of-service-page { background: #fff !important; color: #111827 !important; }
          .terms-of-service-page, .terms-of-service-page * { visibility: visible !important; }
          .terms-print-hide { display: none !important; }
          .terms-of-service-content { max-width: none !important; padding: 0 !important; border: 0 !important; box-shadow: none !important; }
          .terms-of-service-page h2 { break-after: avoid-page; }
          .terms-of-service-page section { break-inside: avoid-page; }
          .terms-of-service-page a { color: inherit !important; text-decoration: none !important; }
        }
      `}</style>

      <div role="banner" className="terms-print-hide border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-900">
            <ArrowLeft aria-hidden="true" size={18} />
            <span className="hidden sm:inline">Back to Taleemi Duniya Pro</span>
            <span className="sm:hidden">Back</span>
          </Link>
          <div className="flex items-center gap-2 font-semibold text-slate-900">
            <BookOpen aria-hidden="true" size={21} className="text-blue-700" />
            <span>Taleemi Duniya Pro</span>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
        <article className="terms-of-service-content overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-blue-100 bg-blue-50 px-6 py-8 sm:px-10 sm:py-10">
            <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-blue-700">Legal</p>
            <h1 className="text-3xl font-bold tracking-tight text-blue-950 sm:text-4xl">
              Terms of Service
            </h1>
            <p className="mt-3 text-sm text-gray-600">
              Last updated: <time dateTime="2026-11-05">November 5, 2026</time>
            </p>
          </div>

          <div className="space-y-8 px-6 py-8 sm:px-10 sm:py-10">
            <section>
              <h2 className="mb-3 text-xl font-semibold text-blue-900">1. Introduction</h2>
              <p className="leading-7">
                These Terms of Service (“Terms”) apply to access to and use of Taleemi Duniya Pro,
                including its school management software, related websites, and educational services
                (collectively, the “Service”). They explain the responsibilities of schools,
                administrators, staff, students, parents, and other authorized users. “We,” “us,”
                and “our” refer to the operators of Taleemi Duniya Pro.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold text-blue-900">2. Acceptance of Terms</h2>
              <p className="leading-7">
                By creating an account, accessing, or using the Service, you agree to these Terms
                and applicable laws. If you use the Service for a school or other organization, you
                represent that you are authorized to accept these Terms on its behalf. If you do not
                agree, do not access or use the Service. A school may have additional written
                arrangements with us; those arrangements govern only where they expressly conflict
                with these Terms.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold text-blue-900">3. About Taleemi Duniya Pro</h2>
              <p className="leading-7">
                Taleemi Duniya Pro provides software for school administration and educational
                operations. Depending on the features enabled for an account, the Service may
                support student and staff records, attendance, fees, classes, examinations,
                academic records, reports, and communication with parents or students. Available
                features may change over time. The Service supports school administration; it does
                not make educational, disciplinary, financial, or other decisions on a school’s
                behalf.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold text-blue-900">4. Account Registration</h2>
              <p className="leading-7">
                Accounts must be created and used by authorized individuals. You must provide
                accurate information, keep account details current, protect your sign-in credentials,
                and promptly notify your school administrator if you suspect unauthorized access.
                Schools are responsible for assigning access only to people who need it and for
                managing their users’ permissions. Each user is responsible for activity carried
                out through their account, except where applicable law provides otherwise.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold text-blue-900">5. User Responsibilities</h2>
              <p className="leading-7">
                You agree to use the Service lawfully, follow these Terms and your school’s
                applicable policies, enter information with reasonable care, and use only the
                features and records you are authorized to access. You must protect account
                credentials, respect the rights and privacy of others, and report suspected
                security issues or misuse to your school or to
                {' '}<a className="text-blue-700 underline" href="mailto:support@taleemiduniya.pro">support@taleemiduniya.pro</a>.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold text-blue-900">6. School Administrator Responsibilities</h2>
              <p className="leading-7">
                A school is responsible for its use of the Service and for its administrators’
                actions. The school must determine which people may use its account, set appropriate
                permissions, keep its account contact information current, and maintain suitable
                procedures for its records and operations. Before submitting student, parent, or
                staff information, the school must ensure it has the necessary authority, notices,
                permissions, and other lawful basis required by applicable law, including any
                requirements relating to children. The school must also respond to requests from
                students, parents, staff, or authorities where it is responsible for doing so.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold text-blue-900">7. Teachers and Staff Responsibilities</h2>
              <p className="leading-7">
                Teachers and other staff may use the Service only within the permissions granted
                by their school. They are responsible for handling student and family information
                confidentially, entering educational or attendance information accurately to the
                extent reasonably possible, and following school instructions for communication
                and recordkeeping. Staff must not disclose records to unauthorized people or use
                them for unrelated purposes.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold text-blue-900">8. Student and Parent Information</h2>
              <p className="leading-7">
                Students and parents may receive access to information or features made available
                by their school. They must use that access only for its intended purpose, keep
                credentials secure, and tell the school if information appears incorrect or an
                account may have been accessed improperly. A parent or guardian should assist a
                child who is not legally able to agree to these Terms independently. The school
                remains responsible for deciding whether and how a student may use the Service.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold text-blue-900">9. Educational Records and Data</h2>
              <p className="leading-7">
                Schools and their authorized users are responsible for the information they submit
                and for the accuracy, lawfulness, and appropriate use of their educational records.
                The Service may store or process information such as student and staff details,
                attendance, fees, examination results, and related school records to provide its
                features. Schools should maintain their own appropriate records and make any
                arrangements they need for record retention or copies. Questions about a student’s
                or family’s records should generally be directed to the relevant school.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold text-blue-900">10. Acceptable Use Policy</h2>
              <p className="mb-3 leading-7">You must not, and must not help another person to:</p>
              <ul className="list-disc space-y-2 pl-6 leading-7">
                <li>Use the Service unlawfully, deceptively, or to harass, harm, or impersonate another person.</li>
                <li>Access another school’s account or records without authorization or bypass access controls.</li>
                <li>Upload malicious code, interfere with the Service, or attempt to disrupt its operation.</li>
                <li>Use the Service to send communications without the required authority or permissions.</li>
                <li>Copy, modify, reverse engineer, or misuse the Service except where applicable law permits or we authorize it.</li>
                <li>Submit content that infringes another person’s rights or violates applicable law.</li>
              </ul>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold text-blue-900">11. Data Privacy and Security</h2>
              <p className="leading-7">
                We use reasonable measures intended to protect information handled through the
                Service, but no online service or method of storage can be guaranteed completely
                secure. Schools and users must also protect their accounts and devices and limit
                access to authorized people. Our
                {' '}<Link className="text-blue-700 underline" to="/privacy-policy">Privacy Policy</Link>
                {' '}describes privacy-related practices and should be read alongside these Terms;
                it does not replace these Terms or any rights that apply under law.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold text-blue-900">12. Third-Party Services</h2>
              <p className="leading-7">
                Some parts of the Service may depend on third-party infrastructure or integrations,
                such as cloud hosting, authentication, messaging, or payment services. Those
                services may be subject to their own terms and privacy practices, and their
                availability or operation may be outside our control. We are not responsible for
                third-party services except to the extent responsibility cannot be excluded under
                applicable law. You should review the applicable third-party terms before using
                an integration.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold text-blue-900">13. Service Availability</h2>
              <p className="leading-7">
                We may update, change, suspend, or discontinue all or part of the Service, including
                for maintenance, security, or operational reasons. The Service may be unavailable
                or may not operate without interruption. We do not promise continuous availability
                or that every feature will always be accessible. Where reasonably practicable, we
                will seek to limit disruption, but users should maintain appropriate school records
                and contingency procedures.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold text-blue-900">14. Intellectual Property</h2>
              <p className="leading-7">
                The Service and its design, software, and related materials are owned by or
                licensed to their respective rights holders and are protected by applicable
                intellectual property laws. These Terms grant you a limited, non-exclusive,
                non-transferable right to use the Service for its intended purpose while you are
                authorized to access it. Schools and users retain any rights they have in content
                and records they submit, and permit their use as reasonably necessary to operate
                and provide the Service. No other rights are granted by implication.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold text-blue-900">15. Suspension and Termination</h2>
              <p className="leading-7">
                A school or user should stop using the Service when their authorization ends.
                Access may be limited or suspended where reasonably necessary to protect users,
                records, or the Service; address suspected misuse or a security risk; comply with
                law; or respond to a school’s access decision. Where practicable, we will provide
                notice and an opportunity to address the issue. If access is ending, the school
                should contact us in a timely manner about any records it needs to retrieve,
                subject to available features, applicable law, and any separate agreement.
                Provisions that by their nature should continue will survive termination.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold text-blue-900">16. Limitation of Liability</h2>
              <p className="leading-7">
                To the extent permitted by applicable law, the Service is provided without
                guarantees that it will be uninterrupted, error-free, or suitable for every
                particular purpose. We are not responsible for decisions made by a school using
                information in the Service, for information submitted or actions taken by users,
                or for outages or events outside our reasonable control. Nothing in these Terms
                excludes or limits liability, rights, or remedies that cannot lawfully be excluded
                or limited. To the extent liability may be limited by law, each party’s liability
                will be limited only to the extent permitted under applicable law.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold text-blue-900">17. Changes to Terms</h2>
              <p className="leading-7">
                We may update these Terms from time to time. The “Last updated” date shows when
                they were most recently revised. Material changes will be communicated through
                the Service or another reasonable means where practicable. Continued use after
                updated Terms take effect means you accept them, to the extent permitted by law.
                If you do not agree to a change, stop using the Service and contact your school
                administrator or us.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold text-blue-900">18. Governing Law</h2>
              <p className="leading-7">
                These Terms are subject to the laws that apply to the relevant user and use of the
                Service, without limiting any mandatory consumer or data-protection rights. Any
                dispute will be handled by a competent court or authority as determined by
                applicable law. Nothing in this section takes away rights that cannot be waived
                or restricted by agreement.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-xl font-semibold text-blue-900">19. Contact Information</h2>
              <p className="leading-7">
                For questions about these Terms or the Service, contact us at
                {' '}<a className="font-medium text-blue-700 underline" href="mailto:support@taleemiduniya.pro">support@taleemiduniya.pro</a>.
              </p>
            </section>
          </div>
        </article>
      </main>

      <footer className="terms-print-hide border-t border-gray-200 bg-gray-50">
        <div className="mx-auto flex max-w-4xl flex-col gap-2 px-4 py-6 text-sm text-gray-600 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© {new Date().getFullYear()} Taleemi Duniya Pro</p>
          <a className="text-blue-700 hover:text-blue-900" href="mailto:support@taleemiduniya.pro">
            support@taleemiduniya.pro
          </a>
        </div>
      </footer>
    </div>
  );
};

export default TermsOfService;

import React from "react";
import { useNavigate } from "react-router-dom";
import { useSiteSettings } from "../frontend/context/SiteSettingsContext";

const TermsAndConditionsPage: React.FC = () => {
  const navigate = useNavigate();
  const { siteSettings } = useSiteSettings();

  return (
    <div className="min-h-screen bg-slate-900 text-white py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold">Terms and Conditions</h1>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-md transition-colors"
          >
            ← Back
          </button>
        </div>

        <div className="bg-slate-800 p-8 rounded-lg border border-slate-700 space-y-6">
          {siteSettings.termsAndConditionsContent ? (
            <div className="prose prose-invert max-w-none text-gray-300">
              <div 
                dangerouslySetInnerHTML={{ __html: siteSettings.termsAndConditionsContent }}
                className="space-y-4"
              />
            </div>
          ) : (
            <>
          <section>
            <h2 className="text-2xl font-semibold mb-3">1. Agreement to Terms</h2>
            <p className="text-gray-300">
              By accessing and using this website and purchasing products from Custom Threads Online Store,
              you accept and agree to be bound by the terms and provision of this agreement. If you do not
              agree to abide by the above, please do not use this service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">2. Use License</h2>
            <p className="text-gray-300 mb-3">
              Permission is granted to temporarily download one copy of the materials (information or software)
              on Custom Threads Online Store website for personal, non-commercial transitory viewing only. This
              is the grant of a license, not a transfer of title, and under this license you may not:
            </p>
            <ul className="text-gray-300 list-disc list-inside space-y-2">
              <li>Modifying or copying the materials</li>
              <li>Using the materials for any commercial purpose or for any public display</li>
              <li>Attempting to decompile or reverse engineer any software contained on the website</li>
              <li>Removing any copyright or other proprietary notations from the materials</li>
              <li>Transferring the materials to another person or "mirroring" the materials on any other server</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">3. Disclaimer</h2>
            <p className="text-gray-300">
              The materials on Custom Threads Online Store website are provided on an 'as is' basis.
              Custom Threads makes no warranties, expressed or implied, and hereby disclaims and negates
              all other warranties including, without limitation, implied warranties or conditions of
              merchantability, fitness for a particular purpose, or non-infringement of intellectual property
              or other violation of rights.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">4. Limitations</h2>
            <p className="text-gray-300">
              In no event shall Custom Threads or its suppliers be liable for any damages (including, without
              limitation, damages for loss of data or profit, or due to business interruption) arising out of
              the use or inability to use the materials on Custom Threads Online Store website, even if Custom
              Threads or an authorized representative has been notified orally or in writing of the possibility
              of such damage.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">5. Accuracy of Materials</h2>
            <p className="text-gray-300">
              The materials appearing on Custom Threads Online Store website could include technical,
              typographical, or photographic errors. Custom Threads does not warrant that any of the materials
              on the website are accurate, complete, or current. Custom Threads may make changes to the materials
              contained on its website at any time without notice.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">6. Links</h2>
            <p className="text-gray-300">
              Custom Threads has not reviewed all of the sites linked to its website and is not responsible for
              the contents of any such linked site. The inclusion of any link does not imply endorsement by
              Custom Threads of the site. Use of any such linked website is at the user's own risk.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">7. Modifications</h2>
            <p className="text-gray-300">
              Custom Threads may revise these terms of service for its website at any time without notice.
              By using this website, you are agreeing to be bound by the then current version of these
              terms of service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">8. Governing Law</h2>
            <p className="text-gray-300">
              These terms and conditions are governed by and construed in accordance with the laws of the
              United States, and you irrevocably submit to the exclusive jurisdiction of the courts in that location.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">9. Product Information</h2>
            <p className="text-gray-300 mb-3">
              We strive to provide accurate product descriptions and pricing. However, we do not warrant that
              product descriptions, pricing, or other content on our website is accurate, complete, reliable,
              current, or error-free. If a product offered by Custom Threads is not as described, your sole
              remedy is to return it unused.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">10. Returns and Refunds</h2>
            <p className="text-gray-300">
              All returns must be initiated within 30 days of purchase. Products must be in original condition
              with all tags attached. Once received and inspected, refunds will be processed within 5-7 business days.
              Shipping costs are non-refundable unless the return is due to our error.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">11. Privacy</h2>
            <p className="text-gray-300">
              Your use of our website is also governed by our Privacy Policy. Please review our Privacy Policy
              to understand our practices.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">12. Contact Information</h2>
            <p className="text-gray-300">
              If you have any questions about these Terms and Conditions, please contact us at:
            </p>
            <div className="mt-3 p-4 bg-slate-700 rounded-md">
              <p className="text-gray-300">Custom Threads Online Store</p>
              <p className="text-gray-400 text-sm mt-2">
                Email: support@customthreads.com<br />
                For more information, please visit our store or contact us through the website contact form.
              </p>
            </div>
          </section>

          <div className="border-t border-slate-600 pt-6 mt-6">
            <p className="text-sm text-gray-400">
              Last updated: January 28, 2026
            </p>
          </div>
            </>
          )}
        </div>

        <div className="mt-8 text-center">
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-3 bg-sky-500 hover:bg-sky-600 text-white rounded-md transition-colors"
          >
            Accept and Return
          </button>
        </div>
      </div>
    </div>
  );
};

export default TermsAndConditionsPage;

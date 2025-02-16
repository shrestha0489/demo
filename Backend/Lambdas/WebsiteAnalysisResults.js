import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  UpdateCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
} from "@aws-sdk/client-apigatewaymanagementapi";

// Configuration from environment variables
const CONFIG = {
  WEBSOCKET_ENDPOINT:
    process.env.WEBSOCKET_ENDPOINT ||
    "wss://he7ifebjve.execute-api.us-east-1.amazonaws.com/production/",
  MAX_RETRIES: parseInt(process.env.MAX_RETRIES || "3"),
  RETRY_DELAY: parseInt(process.env.RETRY_DELAY || "1000"),
  CONNECTIONS_TABLE:
    process.env.CONNECTIONS_TABLE || "demoWebsiteAnalysisResults",
  ANALYSIS_TABLE: process.env.ANALYSIS_TABLE || "demoWebsiteAnalysisResults",
};

// Initialize DynamoDB clients
const client = new DynamoDBClient({});
const dynamoDb = DynamoDBDocumentClient.from(client);

// Sample problems for analysis
const websiteIssues = {
  "getgsi.com": [
    {
      problemDescription:
        "The HubSpot Services page has a 74.8% bounce rate, with 34% more new visitors from organic search over the last 30 days. Heatmaps show 67% of users never scroll past the first section, and CTA clicks (“Get in Touch”) remain at 0.49%, well below the industry benchmark of 1.2%. The current layout lacks a clear differentiation of GSI’s unique approach to HubSpot services, making it harder for visitors to immediately grasp why they should choose GSI over competitors.",
      solutionText: `1. Improve Visual Hierarchy & Readability
        • The “Discover HubSpot by GSI” section is text-heavy, with no clear visual emphasis on differentiators. We will break the section into distinct value blocks using icons, bullet points, and whitespace.
        • Add a stronger subheadline to immediately convey GSI’s expertise in HubSpot implementation.
        
2. Refine CTA Strategy
  • The CTA “Get in Touch” is too generic. We will change it to something value-driven like:
  ✅ “Get a Free HubSpot Strategy Session”
  • Position an inline CTA below the key value points to capture user intent earlier.
        
3. Enhance Engagement with Trust Signals
  • Add client testimonials or case study previews just below the “Why Choose HubSpot” section.
        
  ##### Proposed Solution HTML
        

        <div class="row-fluid-wrapper row-depth-1 row-number-1 dnd-section">
         <div class="row-fluid">
           <!-- Full-width text section -->
           <div class="span12 widget-span widget-type-cell dnd-column">

             <div class="row-fluid-wrapper row-depth-1 row-number-2 dnd-row">
               <div class="row-fluid">
                 <div class="span12 widget-span widget-type-custom_widget dnd-module">
                   <div id="hs_cos_wrapper_widget_1674665246960" class="hs_cos_wrapper hs_cos_wrapper_widget hs_cos_wrapper_type_module widget-type-rich_text">

                     <h3 style="font-size: 18px; font-weight: bold; text-align: center;">Maximize HubSpot's Potential with GSI’s Expert Implementation</h3>
                     <h1 style="text-align: center; font-size: 40px;">Discover HubSpot by GSI – Scalable CRM & Marketing Automation</h1>
                     <p style="text-align: center; font-size: 18px; color: #444;">
                       We don’t just set up HubSpot—we tailor it to your business with <strong>custom workflows, integrations, and automation</strong> that drive ROI.
                     </p>
                     <ul style="list-style: none; text-align: center; padding: 0;">
                       <li>✔ Custom HubSpot implementations designed for scalability</li>
                       <li>✔ Automated workflows to streamline sales & marketing</li>
                       <li>✔ Seamless integrations with NetSuite, JD Edwards, and more</li>
                     </ul>

                     <!-- CTA Button -->
                     <div style="text-align: center; margin-top: 20px;">
                       <a href="https://www.getgsi.com/contact-us/?hsLang=en"
                          class="gsi-cta-insie"
                          title="Get a Free HubSpot Strategy Session"
                          style="display: inline-block; background-color: #E6823E; color: #fff; padding: 12px 24px; text-decoration: none; font-size: 18px; font-weight: bold; border-radius: 5px;">
                         Get a Free HubSpot Strategy Session
                       </a>
                     </div>


                     <!-- HubSpot Logo Below CTA -->
                     <div style="text-align: center; margin-top: 20px;">
                       <img src="https://www.getgsi.com/hubfs/GSI%20Website%20Assets/hubspot%20logo.png"
                            alt="HubSpot Logo"
                            title="HubSpot Logo"
                            style="max-width: 200px; height: auto;">
                     </div>


                   </div>
                 </div>
               </div>
             </div>

           </div><!-- End Full-width text section -->

         </div>
        </div>

        <div class="row-fluid-wrapper row-depth-1 row-number-5 dnd-section">
         <div class="row-fluid">
           <div class="span6 widget-span widget-type-cell dnd-column">
             <div class="row-fluid-wrapper row-depth-1 row-number-6 dnd-row">
               <div class="row-fluid">
                 <div class="span12 widget-span widget-type-custom_widget dnd-module">
                   <div id="hs_cos_wrapper_widget_1678473684879" class="hs_cos_wrapper hs_cos_wrapper_widget hs_cos_wrapper_type_module widget-type-rich_text">
                     <h2 style="font-size: 22px; font-weight: bold;">Why Choose GSI for HubSpot?</h2>
                     <p style="font-size: 18px; color: #444;">
                       HubSpot is powerful, but without expert customization businesses fail to unlock its full potential. GSI ensures seamless adoption by implementing the **right processes, automations, and optimizations** for your business.
                     </p>
                     <ul style="font-size: 16px; color: #444;">
                       <li>98% customer satisfaction in HubSpot deployments</li>
                       <li> Proven track record in CRM &amp; automation for enterprises</li>
                       <li> Hands-on onboarding &amp; ongoing support</li>
                     </ul>
                   </div>
                 </div>
               </div>
             </div>
           </div>


           <div class="span6 widget-span widget-type-cell dnd-column">
             <div class="row-fluid-wrapper row-depth-1 row-number-7 dnd-row">
               <div class="row-fluid">
                 <div class="row-fluid-wrapper row-depth-1 row-number-7 dnd-row">
         <div class="row-fluid">
           <div class="span12 widget-span widget-type-custom_widget dnd-module">
             <div id="hs_cos_wrapper_module_1678474581185" class="hs_cos_wrapper hs_cos_wrapper_widget hs_cos_wrapper_type_module widget-type-rich_text">
               <h2 style="font-size: 22px; font-weight: bold;">Real Results from GSI Clients</h2>
               <p style="font-size: 23px; color: #444;">
                 Revenue growth doubled after switching to GSI’s HubSpot optimization strategy.
               </p>
               <p style="font-size: 23px; color: #444;">
                 115% increase in organic contacts—GSI made HubSpot work for us.
               </p>
             </div>
           </div>
         </div>
        </div>
               </div>
             </div>
           </div>


         </div>
        </div><!--end row-wrapper -->
        `,
      impactText: `Bounce Rate Reduction: Estimated 6-12% improvement due to more readable, scannable content.
      Higher Scroll Depth: Encouraging engagement with structured sections and testimonials.
       Improved CTA Clicks: At least 1.2% CTA CTR with better wording and placement.
`,
    },
    {
      problemDescription:
        "The Cybersecurity Overview page has seen a 40% traffic surge from the “Cybersecurity” Google Ads campaign, but time-on-page is just 12.8 seconds, indicating users leave quickly. The broad “Cybersecurity” ad campaign is likely bringing in mixed-intent traffic (CISOs, IT admins, business leaders) with no clear messaging for each. Additionally, the page lacks urgency triggers and interactive elements to keep visitors engaged.",
      solutionText: `1️⃣ Content & Messaging Optimization
• Headline Update: Refine the title to “Cybersecurity Services – Protect, Detect, Respond” to establish clarity and actionability.
• Personalized Sections: Modify subheaders to “For CISOs | For IT Admins | For Business Leaders” to ensure relevance at a glance.
• Concise Pain Points: Instead of listing threats generically, reframe:
• CISOs: “Ensure compliance and eliminate security blind spots.”
• IT Admins: “Real-time threat detection and automation for minimal downtime.”
• Business Leaders: “Reduce security risks while optimizing costs.”

 2️⃣ Urgency & Time-Sensitive Offers
• CTA Enhancement: Replace “Talk to a GSI Cybersecurity Expert” with “Get a 30-Minute Free Security Audit” in the button.
• Limited-Time Offer Banner: Above the main text, add a “This Month Only: Free Vulnerability Scan for Consultation Requests” banner to create urgency.
 3️⃣ Interactive Engagement Triggers 
• Risk Score Assessment Tool: Embed a “See Your Risk Score in 60 Seconds” CTA next to the main CTA button. This is for a subsequent experiment.

##### Proposed Solution HTML
      
      <div class="row-fluid-wrapper row-depth-1 row-number-1 dnd_area-row-0-vertical-alignment dnd-section">
      <div class="row-fluid ">
         <div class="span5 widget-span widget-type-cell cell_1687196825652-vertical-alignment dnd-column">
             <div class="row-fluid-wrapper row-depth-1 row-number-2 dnd-row">
                 <div class="row-fluid ">
                     <div class="span12 widget-span widget-type-custom_widget widget_1690383651613-flexbox-positioning dnd-module">
                         <div id="hs_cos_wrapper_widget_1690383651613" class="hs_cos_wrapper hs_cos_wrapper_widget hs_cos_wrapper_type_module widget-type-linked_image">
                             <span id="hs_cos_wrapper_widget_1690383651613_" class="hs_cos_wrapper hs_cos_wrapper_widget hs_cos_wrapper_type_linked_image">
                                 <img src="https://www.getgsi.com/hubfs/GSI%20Website%20Assets/Cybersecurity%20Main-min.jpg" class="hs-image-widget" style="max-width: 100%; height: auto;" alt="Cybersecurity Main-min" title="Cybersecurity Main-min" loading="lazy">
                             </span>
                         </div>
                     </div>
                 </div>
             </div>
         </div>


         <div class="span7 widget-span widget-type-cell dnd-column cell_16871957287383-vertical-alignment">
             <!-- New Limited-Time Offer Banner -->



             <!-- Updated Cybersecurity Messaging -->
             <div class="row-fluid-wrapper row-depth-1 row-number-4 dnd-row">
                 <div class="row-fluid">
                     <div class="span12 widget-span widget-type-custom_widget dnd-module">
                         <div id="hs_cos_wrapper_module_16871957287395" class="hs_cos_wrapper hs_cos_wrapper_widget hs_cos_wrapper_type_module widget-type-rich_text">
                             <h1>Cybersecurity Services – Protect, Detect, Respond</h1>
                             <h3>Proactive Security Solutions for Modern Threats</h3>
                             <p>
                                 Cyber threats are evolving rapidly. From ransomware to supply chain attacks, businesses face an increasing number of threats with severe financial and reputational consequences.
                                 <strong>Last year alone, over <a href="https://techopedia.com/cybersecurity-statistics" target="_blank">493 million ransomware attacks</a> were recorded, costing an average of $4.35M per breach.</strong>
                             </p>
                             <p>
                                 GSI’s cybersecurity solutions go beyond standard protection. Whether you’re a CISO ensuring compliance, an IT leader securing infrastructure, or a business executive reducing risk exposure—our tailored strategies help fortify your enterprise.
                             </p>
                         </div>
                     </div>
                 </div>
             </div>


             <!-- Audience-Specific Content Blocks -->
             <div class="row-fluid-wrapper row-depth-1 row-number-5 dnd-row">

             </div>


             <!-- New Call-to-Action -->
             <div class="row-fluid-wrapper row-depth-1 row-number-6 dnd-row">
                 <div class="row-fluid">
                     <div class="span12 widget-span widget-type-custom_widget dnd-module">
                         <div class="gsi-cta-module desktop-center mobile-center col-cta-1">
                             <a href="https://www.getgsi.com/security-audit" class="gsi-cta-insie" title="Get a Free Security Audit">
                                 <div>Get a 30-Minute Free Security Audit</div>
                             </a>
                         </div>
                     </div>
                 </div>
             </div>


         </div>
      </div>


      <!-- CSS for Styling -->
      <style>
         .limited-time-banner { background: #ff0000; color: white; text-align: center; padding: 10px; font-weight: bold; }
         .content-box { padding: 20px; background: #eef2f6; text-align: center; border-radius: 5px; }
         .gsi-cta-insie { display: inline-block; padding: 12px 20px; background: #ff6600; color: white; text-decoration: none; font-weight: bold; }
         .risk-assessment { text-align: center; padding: 20px; background: #eef2f6; }
         .faq-section { margin-top: 30px; padding: 20px; background: #f8f9fa; border-radius: 5px; }
         .faq-item { margin-bottom: 10px; }
         .faq-question { background: none; border: none; font-weight: bold; cursor: pointer; }
         .faq-answer { display: none; padding-top: 5px; }
         .faq-question:hover + .faq-answer { display: block; }
      </style><!--end row--><div class="row-fluid-wrapper row-depth-1 row-number-5 dnd-row" style="padding:40px;">
                 <div class="row-fluid">
                     <div class="span4 widget-span widget-type-custom_widget dnd-module">
                         <div class="content-box">
                             <h2>For CISOs</h2>
                             <p>Ensure compliance and eliminate security blind spots with proactive security frameworks.</p>
                         </div>
                     </div>
                     <div class="span4 widget-span widget-type-custom_widget dnd-module">
                         <div class="content-box">
                             <h2>For IT Admins</h2>
                             <p>Leverage real-time threat detection and automated security response for minimal downtime.</p>
                         </div>
                     </div>
                     <div class="span4 widget-span widget-type-custom_widget dnd-module">
                         <div class="content-box">
                             <h2>For Business Leaders</h2>
                             <p>Reduce cybersecurity risks while optimizing costs and ensuring regulatory alignment.</p>
                         </div>
                     </div>
                 </div>
             </div>


      </div>
      `,
      impactText:
        "A **2X increase in session duration**, a 5-8% higher conversion rate, and a 15-20% drop in bounce rate by aligning content with user intent and optimizing for engagement. ",
    },
    {
      problemDescription:
        "The website’s case studies mostly feature NetSuite projects, with only one focusing on cybersecurity. This lack of diverse representation contributes to a significant drop-off during the consideration phase for cybersecurity services, particularly amidst ongoing paid campaigns. Currently, the conversion rate for the cybersecurity consideration journey is just 0.1%. By adding more targeted cybersecurity case studies, this rate could potentially increase by at least 3X, given the low starting point.",
      solutionText: `Develop and prominently display additional cybersecurity case studies on the website, focusing on relevant and impactful topics. These case studies should highlight successful cybersecurity projects, detailing the challenges faced, solutions implemented, and measurable outcomes achieved. Key topics to cover include:
 1. Phishing Simulation and Training: Show how your services helped organizations implement phishing testing platforms to educate employees and mitigate phishing attack risks.
      
 2. Emerging Cybersecurity Threats: Showcase your proactive approach in addressing new threats like supply chain software attacks and AI-driven cyberattacks, and demonstrate how your solutions have protected clients.
      
 3. Zero Trust Security Implementations: Highlight successful deployments of Zero Trust models, showing how they enhanced clients’ security by ensuring strict verification for all users and devices.
      
 4. Cybersecurity Assessments and Compliance: Illustrate how your comprehensive assessments helped organizations identify vulnerabilities, meet compliance requirements, and develop robust security strategies.
      
 5. Incident Response and Ransomware Negotiations: Provide insights into your role in assisting clients during ransomware attacks, including negotiation and recovery strategies, to showcase your crisis management expertise.
      Incorporate client testimonials to further add credibility and appeal. By creating a diverse set of case studies and strategically displaying them, you can engage visitors, demonstrate your cybersecurity expertise, and significantly increase conversion rates during the consideration phase.


##### Proposed Solution HTML
        Not Applicable. The changes require asset generation before changes are made to the website

`,
      impactText:
        "Expanding cybersecurity case studies can boost consideration-phase conversions by 3X, reducing drop-offs and driving more qualified inquiries.",
    },
  ],
  "squadcast.com": [
    {
      problemDescription:
        "Average time on site has dropped from 6 minutes to 45 seconds, signaling a decline in engagement. A major contributing factor is the disappearance of high-value repeat users who originally came from Software Advice, a referral source that is now inactive. This cohort had a higher conversion rate and longer session duration compared to other traffic sources, but their absence has gone unnoticed due to standard attribution methods missing the impact of lost referral streams.",
      solutionText: `Relaunch referral campaigns targeting the same high-intent cohort through alternative review platforms and partner networks. Identify similar third-party referral sources (e.g., G2, Capterra, TrustRadius) and run tailored acquisition campaigns to recapture the lost organic funnel. Brainstorm recommended to finalize campaign
##### Proposed Solution HTML
       Not Applicable. The changes require executive brainstorming.
`,
      impactText: `Re-engaging this high-value cohort can restore lost engagement and conversions, significantly increasing time-on-site and lead quality while preventing further audience attrition.
`,
    },
    {
      problemDescription: `Misalignment Between Target Persona and Conversion Flow. The highest-converting users are CIOs, yet the website experience primarily caters to developers opting for free trials. The current flow prioritizes a self-serve onboarding path, which attracts developers but does not align with how CIOs evaluate and purchase reliability automation solutions. As a result, while trial sign-ups remain steady, enterprise purchase conversions remain low, leading to inefficient monetization.`,
      solutionText: `1. Messaging Shift to CIO Pain Points
• The headline currently focuses on uptime (developer concern).
• Modify it to reflect business and operational impact, which resonates with CIOs.
      
✅ Before: Be in Control of Uptime
✅ After: Ensure Business Continuity with AI-Driven Reliability
      
 2. CTA Prioritization for Enterprise Decision-Makers
• “Start for Free” is attractive for developers but dilutes enterprise intent.
• Swap primary CTA to “Request a Custom Reliability Audit”, positioning Squadcast as a strategic partner.
      
✅ Before: Start For Free Now | Schedule a Demo
✅ After: Request a Custom Reliability Audit | See How Enterprises Use Squadcast
      
 3. G2 Awards Section: Emphasizing Enterprise Success
• The G2 awards already highlight enterprise but aren’t effectively leveraged.
• Add a subheadline connecting the awards to enterprise-scale reliability management.
      
✅ Before: Leading with Innovation: Pioneering Unified Incident Management
✅ After: Trusted by Enterprise IT Teams for Unmatched Uptime & Security


##### Proposed Solution HTML
      <div class="columns-386 innerpages audit v w-row">
         <div class="w-col w-col-6 w-col-stack">
           <div class="div-block-644 _600">
             <div class="div-block-1007 _5 f">
               <h1 class="text-block-614 nobold nf audit">Ensure Business Continuity with</h1>
               <div class="scroller inline h audit">
                 <div class="text-block-694 nf bl audit" style="transform: translate3d(0px, -2.35em, 0px) scale3d(1, 1, 1) rotateX(0deg) rotateY(0deg) rotateZ(0deg) skew(0deg, 0deg); transform-style: preserve-3d;">
                   AI-Driven Reliability<br>Enterprise-Grade Security<br>Automated Risk Mitigation
                 </div>
               </div>
             </div>
             <h2 class="text-block-614 innerpages h2"></h2>
             <div class="text-block-616 _0m _18-24 audit">
               Reduce downtime, mitigate risks, and enhance operational resilience with Squadcast’s
               <span class="text-span-27">AI-Powered Reliability Automation</span>.
               Proactively manage incidents and ensure uptime across your enterprise IT infrastructure.
             </div>
             <div class="div-block-1337">
               <a href="https://register.squadcast.com/" class="dark-button italics demo light-button _0l w-button" is_conv_type="Hard" data-faitracker-click-bind="true">
                 Request a Custom Reliability Audit
               </a>
               <a id="sd11" href="#" class="dark-button italics demo light-button _0ml _15l w-button" data-faitracker-click-bind="true" style="margin-top:0.5em;margin-left:0em;">
                 See How Enterprises Use Squadcast
               </a>
             </div>
             <div class="w-embed w-script">
               <script>
                 var btn3 = document.getElementById("sd11");
                 btn3.onclick = function(){
                   btn.click();
                 }
               </script>
             </div>
           </div>
         </div>


         <div class="w-col w-col-6 w-col-stack">
           <div class="div-block-645 _600 audit">
             <div class="div-block-1143 audit">
               <div class="div-block-1144">
                 <img src="https://cdn.prod.website-files.com/5c51758c58939b30a6fd3d73/66b9df3a7dbfa495625a820f_43207c1dfdbba1d1f76d73f6866f6c7f.png" loading="lazy" alt="Top IT Management Product" class="image-616 f">
                 <img src="https://cdn.prod.website-files.com/5c51758c58939b30a6fd3d73/66b9df8dca349144ca108579_medal%20(7).png" loading="lazy" alt="High Performer Enterprise" class="image-616 audit">
                 <img src="https://cdn.prod.website-files.com/5c51758c58939b30a6fd3d73/66b9dec686e33fa3f4f3d405_medal%20(4).png" loading="lazy" alt="Fastest Implementation Enterprise" class="image-616">
               </div>
               <div class="text-block-616 _0m dark _68p _10p pill-shaped w" style="top:-35%;">
                 Trusted by CIOs &amp; IT Teams to Minimize Risk, Ensure Compliance &amp; Maximize Uptime
               </div>
             </div>
           </div>
         </div>
       </div>
      `,
      impactText: `By repositioning messaging & CTA toward CIOs, demo requests are expected to increase by 30-40%, leading to higher contract-value conversions.
        Reducing developer sign-ups that never convert improves marketing efficiency, potentially reducing CAC by 15-20% over 6 months.
        AI-Powered Reliability Positioning aligns Squadcast with higher-tier incident management solutions, increasing perceived value and justifying premium pricing.
`,
    },
    {
      problemDescription: `Pricing Page Friction Leading to Drop-offs in Decision Journey. Squadcast’s Pricing page has a 78% bounce rate, with CIOs and enterprise buyers failing to engage. The page prioritizes developer-focused feature breakdowns, causing decision paralysis in the decision phase. Lack of ROI framing, persona-driven clarity, and guided CTAs prevents high-intent visitors from converting.`,
      solutionText: `1. Reframe the Page Header for CIOs & Decision-Makers
        • Change “Reliability. At any cost.” to “Reliability That Scales With Your Business” or “Enterprise-Grade Reliability, Built for Growth” to emphasize value over cost.
        
 2. Prioritize Enterprise-Driven Messaging
• Add a subheader above the pricing table:
“For Enterprise Teams: Custom SLAs, Compliance Support, and Dedicated Security Features Available.”
• Highlight benefits like security, compliance, and cost savings in Enterprise Plan.

 3. Introduce ROI Framing & Feature Comparison
• Add “Total Cost of Downtime Calculator” for buyers to assess Squadcast’s cost-effectiveness.
• Incorporate a table or bullet list comparing Enterprise vs. Premium vs. Pro, focusing on how Enterprise saves time and money for CIOs.

 4. Improve Call-to-Action (CTA) Strategy
• Change “Start Free Trial” to “Try Squadcast Risk-Free” (for Pro & Premium) and
“Get a Custom Enterprise Plan” (instead of “Contact Us”).
        
##### Proposed Solution HTML
        Pricing and pricing page changes are generated only after explicit approval.
`,
      impactText: `Reduces bounce rate by 15-20%, improving decision journey continuity.
      Increases demo requests by 25-30% from enterprise visitors currently exiting without engagement.
      Boosts paid conversion rates by 2-3X, as clearer value differentiation encourages CIOs to take action faster.`,
    },
  ],
  "sonatype.com": [
    {
      problemDescription: `Drop-off in Engagement for Mid-Funnel Visitors. Despite strong traffic, engagement on the Repository Firewall page is weak, with an average time on page of 41 seconds (well below the 2-minute benchmark). 72% of visitors never scroll past the first fold, and CTA clicks are under 0.6%. The page lacks interactive elements to guide mid-funnel users toward deeper exploration, leading to premature exits.`,
      solutionText: `Proposed Solution (Text Explanation)
      Introduce an interactive ROI calculator or a “Test Your Risk Exposure” tool to engage mid-funnel users. Add a personalized industry selector at the top of the page, allowing users to navigate content most relevant to their needs.
##### Proposed Solution HTML
      Not part of PRO plan.
`,
      impactText: `Increasing mid-funnel engagement by just 30 seconds can double the likelihood of demo sign-ups, leading to a potential 15-20% uplift in conversion rates.`,
    },
    {
      problemDescription: `Low Conversion from Organic Visitors Due to Competitive Overlap. Organic search brings 63% of traffic, but demo conversion from them is below 0.4%. Many visitors are looking for general security scanning tools, not repository protection, due to overlapping keyword rankings with competitors like Snyk and JFrog. The current messaging doesn’t differentiate real-time policy enforcement as a unique advantage.
      The existing messaging focuses on “blocking open-source risk,” which overlaps with broader SCA (Software Composition Analysis) solutions. However, Repository Firewall is differentiated by real-time policy enforcement at the point of entry, a feature not emphasized enough to attract the right audience.`,
      solutionText: `Refine messaging to clearly distinguish Repository Firewall from traditional scanning tools. Add a comparison table above the fold that contrasts “Real-time Prevention” vs. “Post-Scan Detection”, reinforcing Sonatype’s unique value proposition.
##### Proposed Solution HTML
        Not part of PRO plan.
`,
      impactText: `A clearer product-positioning strategy can reduce bounce rates by 15-20%, improve demo request rates, and increase qualified inbound leads by 30% over 3-6 months.`,
    },
    {
      problemDescription: `Security Decision-Makers Not Engaging with the Page. Based on IP tracking and user behavior analytics, only 14% of visitors are security leaders (CISOs, Security Architects, Compliance Teams)—the core decision-makers for purchasing Repository Firewall. In contrast, 58% of visitors are developers, who may be interested but lack purchasing authority. The “Get a Demo” CTA competes with free content downloads, leading to low intent signals.
      The current page layout does not prioritize executive buyers. The messaging and CTAs are developer-focused, lacking high-level security, governance, and compliance narratives that CISOs prioritize.`,
      solutionText: `Implement a split-path CTA:
• Developers see “Test in Your Environment” (hands-on product sandbox).
• Security leaders see “CISO Briefing: See Firewall in Action” (live walkthrough focused on compliance & risk).
        
##### Proposed Solution HTML
        Not part of PRO plan.
`,
      impactText: `Increasing security leadership engagement by even 10% can triple the pipeline impact since CISOs have 5X higher likelihood to convert to high-ACV deals than developers.`,
    },
  ],
};

const normalizeUrl = (url) => {
  return url
    .replace(/^https?:\/\//, "") // Remove protocol (http:// or https://)
    .replace(/^www\./, "") // Remove "www." if it exists
    .toLowerCase(); // Convert the URL to lowercase
};

// Helper function to validate if URL exists in our database
const validateUrl = (url) => {
  const normalizedUrl = normalizeUrl(url);
  return websiteIssues.hasOwnProperty(normalizedUrl) ? normalizedUrl : null;
};

// Utility function for delay with exponential backoff
const delay = (attempt) => {
  const backoff = Math.min(CONFIG.RETRY_DELAY * Math.pow(2, attempt), 5000);
  return new Promise((resolve) => setTimeout(resolve, backoff));
};

// New function to find WebSocket connection for a taskId with exponential backoff
async function findConnectionIdForTask(taskId) {
  for (let attempt = 0; attempt < CONFIG.MAX_RETRIES; attempt++) {
    try {
      const params = {
        TableName: CONFIG.CONNECTIONS_TABLE,
        KeyConditionExpression: "taskId = :taskId",
        ExpressionAttributeValues: { ":taskId": taskId },
      };

      const result = await dynamoDb.send(new QueryCommand(params));
      if (result.Items && result.Items.length > 0) {
        return result.Items[0].connectionId;
      }

      if (attempt < CONFIG.MAX_RETRIES - 1) {
        await delay(attempt);
      }
    } catch (error) {
      console.error(
        `Error finding connectionId for taskId (attempt ${attempt + 1}):`,
        error,
      );
      if (attempt < CONFIG.MAX_RETRIES - 1) {
        await delay(attempt);
      }
    }
  }
  return null;
}

// Event parsing function with enhanced validation
export const parseEvent = (event) => {
  console.log("Received event:", JSON.stringify(event, null, 2));

  try {
    const payload =
      typeof event.body === "string"
        ? JSON.parse(event.body)
        : event.body || event;

    if (!payload.url || !payload.taskId) {
      throw new Error("URL and taskId are required in the payload");
    }

    const endpoint = event.requestContext
      ? `https://${event.requestContext.domainName}/${event.requestContext.stage}`
      : CONFIG.WEBSOCKET_ENDPOINT.replace("wss://", "https://");

    return {
      url: payload.url,
      taskId: payload.taskId,
      connectionId: event.requestContext?.connectionId,
      endpoint,
    };
  } catch (error) {
    throw new Error(`Event parsing failed: ${error.message}`);
  }
};

// Enhanced WebSocket message sender with connection status handling
export const sendMessageToClient = async (connectionId, message, endpoint) => {
  if (!connectionId || !endpoint) {
    console.log(
      "Skipping WebSocket message - missing connectionId or endpoint",
    );
    return;
  }

  const client = new ApiGatewayManagementApiClient({
    endpoint: endpoint.replace("wss://", "https://"),
    maxAttempts: CONFIG.MAX_RETRIES,
  });

  const params = {
    ConnectionId: connectionId,
    Data: JSON.stringify({
      ...message,
      timestamp: new Date().toISOString(),
    }),
  };

  try {
    await client.send(new PostToConnectionCommand(params));
    console.log(`Message sent to connection: ${connectionId}`);
  } catch (error) {
    if (error.name === "GoneException") {
      console.log(`Connection ${connectionId} is no longer available`);
      return;
    }
    console.error(
      `Error sending message to connection ${connectionId}:`,
      error,
    );
    throw error;
  }
};

// Helper function to update task status in DynamoDB
export const updateTaskStatus = async (taskId, status, data = {}) => {
  console.log("Updating task status in DynamoDB:", taskId, status, data);

  const timestamp = new Date().toISOString();
  const updateExpression = ["set #status = :status", "#timestamp = :timestamp"];
  const expressionAttributeValues = {
    ":status": status,
    ":timestamp": timestamp,
  };
  const expressionAttributeNames = {
    "#status": "status",
    "#timestamp": "timestamp",
  };

  if (data.problems) {
    updateExpression.push("problems = :problems");
    expressionAttributeValues[":problems"] = data.problems;
  }

  if (data.error) {
    updateExpression.push("#error = :error");
    expressionAttributeValues[":error"] = data.error;
    expressionAttributeNames["#error"] = "error";
  }

  const params = {
    TableName: CONFIG.ANALYSIS_TABLE,
    Key: { taskId },
    UpdateExpression: updateExpression.join(", "),
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
  };

  try {
    await dynamoDb.send(new UpdateCommand(params));
    console.log(`Task ${taskId} updated successfully in DynamoDB`);
    return true;
  } catch (error) {
    console.error("Error updating task status in DynamoDB:", error);
    throw error;
    return false;
  }
};

// Enhanced progress update with error handling
export const sendProgressUpdate = async (
  connectionId,
  endpoint,
  taskId,
  currentStep,
  progress,
) => {
  if (!connectionId || !endpoint) return;

  try {
    await sendMessageToClient(
      connectionId,
      {
        taskId,
        status: "processing",
        currentStep,
        progress,
        timestamp: new Date().toISOString(),
      },
      endpoint,
    );
  } catch (error) {
    console.warn(`Failed to send progress update for task ${taskId}:`, error);
    // Continue execution - progress updates are non-critical
  }
};

// Enhanced Lambda handler with comprehensive error handling
export const handler = async (event) => {
  let taskId;
  let connectionId;

  try {
    console.log(
      "Lambda invocation with event:",
      JSON.stringify(event, null, 2),
    );
    const parsedEvent = parseEvent(event);
    taskId = parsedEvent.taskId;

    // Find the associated WebSocket connection
    connectionId = await findConnectionIdForTask(taskId);
    console.log(`Found connectionId ${connectionId} for taskId ${taskId}`);

    // Validate URL
    const validUrl = validateUrl(parsedEvent.url);
    if (!validUrl) {
      // Send error message through WebSocket if URL doesn't exist
      if (connectionId) {
        await sendMessageToClient(
          connectionId,
          {
            taskId,
            status: "error",
            error: "Client doesn’t exist",
            currentStep: "validation",
            progress: 0,
          },
          parsedEvent.endpoint,
        );
      }

      // Update task status to error
      await updateTaskStatus(taskId, "error", {
        error: "Client doesn’t exist",
      });

      return {
        statusCode: 404,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId,
          status: "error",
          message: "Client doesn’t exist",
        }),
      };
    }

    // Random delay between 5000ms and 10000ms
    const getRandomDelay = () =>
      Math.floor(Math.random() * (10000 - 5000 + 1)) + 5000;

    const progressSteps = [
      { step: "Fetching Website", progress: 20, delay: getRandomDelay() },
      { step: "Analyzing Performance", progress: 40, delay: getRandomDelay() },
      { step: "Analyzing UI/UX", progress: 60, delay: getRandomDelay() },
      {
        step: "Generating Recommendations",
        progress: 80,
        delay: getRandomDelay(),
      },
    ];

    // Send progress updates if we have a connection
    async function sendProgressWithDelay() {
      for (const { step, progress, delay } of progressSteps) {
        console.log(
          `Sending progress update for ${step} with progress ${progress}`,
        );
        if (connectionId) {
          await sendProgressUpdate(
            connectionId,
            parsedEvent.endpoint,
            taskId,
            step,
            progress,
          );
          console.log(
            `Sent progress update for ${step} with progress ${progress}`,
          );
        }
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    await sendProgressWithDelay();

    // Get analysis results for the specific URL
    const analysisResults = websiteIssues[validUrl].map((problem, index) => ({
      ...problem,
      problemId: `problem-${index + 1}`,
      timestamp: new Date().toISOString(),
    }));

    // Final update in DynamoDB with completed status and results
    const finalUpdateSuccess = await updateTaskStatus(taskId, "completed", {
      problems: analysisResults,
    });
    if (!finalUpdateSuccess) {
      throw new Error("Could not complete task - status update failed");
    }

    // Send final results through WebSocket if connected
    if (connectionId) {
      await sendMessageToClient(
        connectionId,
        {
          taskId,
          status: "completed",
          problems: analysisResults,
          step: "completed",
          progress: 100,
        },
        parsedEvent.endpoint,
      );
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        taskId,
        status: "completed",
        problems: analysisResults,
      }),
    };
  } catch (error) {
    console.error("Error in lambda function:", error);

    if (taskId) {
      try {
        await updateTaskStatus(taskId, "error", { error: error.message });

        if (connectionId) {
          await sendMessageToClient(
            connectionId,
            {
              taskId,
              status: "error",
              error: error.message,
              currentStep: "error",
              progress: 0,
            },
            CONFIG.WEBSOCKET_ENDPOINT.replace("wss://", "https://"),
          );
        }
      } catch (updateError) {
        console.error("Error updating task status after failure:", updateError);
      }
    }

    return {
      statusCode: error.statusCode || 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        taskId,
        status: "error",
        message: error.message || "Internal Server Error",
        type: error.name,
      }),
    };
  }
};

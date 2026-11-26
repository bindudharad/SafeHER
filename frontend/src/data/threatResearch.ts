export interface ThreatResearchTopic {
  id: string
  title: string
  category: string
  shortDescription: string
  whatItMeans: string
  howItWorks: string[]
  warningSigns: string[]
  howToProtect: string[]
  evidenceToPreserve: string[]
  recommendedNextSteps: {
    label: string
    to: string
  }[]
  severity: 'low' | 'medium' | 'high' | 'critical'
}

export const THREAT_RESEARCH_TOPICS: ThreatResearchTopic[] = [
  {
    id: 'deepfake-impersonation',
    title: 'Deepfake & Face-Swap Impersonation',
    category: 'Synthetic Media',
    shortDescription: 'Manipulated portrait imagery, non-consensual face swaps, and fabricated video.',
    whatItMeans:
      'The unauthorized digital grafting of an individual’s facial likeness onto another person’s body or synthetic video using deep learning models, often for humiliation, extortion, or political deception.',
    howItWorks: [
      'Attackers harvest public facial photographs from social accounts or online portfolios.',
      'A deep neural network (e.g. RoOP, SimSwap, or diffusion face-restoration) aligns facial keypoints.',
      'Synthetic output is synthesized into video or images and disseminated across group channels.',
    ],
    warningSigns: [
      'Blurry or warped artifacts around the jawline, neck, and hairline during sudden motion.',
      'Teeth appearing as uniform white blocks without individual tooth boundaries.',
      'Unnatural blinking rates or pupils that do not reflect ambient light sources consistently.',
    ],
    howToProtect: [
      'Watermark high-resolution public images with subtle metadata tags.',
      'Restrict public visibility of personal portrait albums on social networks.',
      'Never engage in retaliatory distribution; isolate and document the attack vector.',
    ],
    evidenceToPreserve: [
      'Original source video or image file (uncompressed).',
      'Full screenshot of the distribution channel showing account handle, date, and comments.',
      'Platform post URL and archive link via Web Archive where possible.',
    ],
    recommendedNextSteps: [
      { label: 'Analyze in Detect Verifier', to: '/detect' },
      { label: 'Preserve in Vault', to: '/evidence' },
      { label: 'File Grievance Takedown', to: '/complaints' },
    ],
    severity: 'critical',
  },
  {
    id: 'voice-cloning',
    title: 'Voice Cloning & Audio Deepfakes',
    category: 'Audio Manipulation',
    shortDescription: 'AI-synthesized speech replicating an individual’s pitch, cadence, and vocal tone.',
    whatItMeans:
      'Using machine learning models to synthesize voice replicas from short audio clips, weaponized in kidnapping scams, fraudulent wire authorizations, and reputation attacks.',
    howItWorks: [
      'Perpetrator downloads audio from video reels, podcast appearances, or voice messages.',
      'Neural text-to-speech tools clone acoustic timbres from as little as 3 seconds of reference audio.',
      'Extortion phone calls are placed to parents or close colleagues simulating frantic distress.',
    ],
    warningSigns: [
      'Sudden urgent monetary requests demanding instant cash, UPI, or cryptocurrency.',
      'Voice sounds slightly robotic on sustained vowels or lacks breathing pauses.',
      'Caller avoids answering specific historical questions or changes the topic immediately.',
    ],
    howToProtect: [
      'Establish a secret family duress passphrase that is never texted or posted online.',
      'Hang up immediately and call back on the person’s verified cellular telephone number.',
      'Be wary of answering calls from unknown international VoIP prefixes (+1, +44, +92).',
    ],
    evidenceToPreserve: [
      'Audio call recordings or voicemail audio files.',
      'Call history logs with exact carrier timestamps.',
      'Phone numbers and caller IDs displayed during the incident.',
    ],
    recommendedNextSteps: [
      { label: 'Report Incident to Vault', to: '/incidents/new' },
      { label: 'Read Voice Cloning Guide', to: '/knowledge-hub/voice-cloning-family-emergency-scams' },
    ],
    severity: 'critical',
  },
  {
    id: 'online-harassment',
    title: 'Online Harassment & Coordinated Brigading',
    category: 'Targeted Abuse',
    shortDescription: 'Persistent cyberstalking, sexualized comments, and coordinated trolling campaigns.',
    whatItMeans:
      'A pattern of repeated hostile messages, intimidation, hate speech, or mass trolling targeted at an individual to induce severe distress, fear, or reputational damage.',
    howItWorks: [
      'Abuser organizes multiple fake burner profiles or recruits external troll channels.',
      'Coordinated hostile comments flood victim’s public posts within short time windows.',
      'Abusive direct messages escalate into explicit threats of violence or defamation.',
    ],
    warningSigns: [
      'Spike in abusive comments containing nearly identical copied phrases across multiple platforms.',
      'Repeated tagging of your employer, family members, or educational institution in slanderous posts.',
      'Sudden influx of friend requests from newly created accounts with zero mutual connections.',
    ],
    howToProtect: [
      'Temporarily switch profiles to private mode and restrict comment permissions.',
      'Disable location tagging and metadata on future uploads.',
      'Do not respond or engage; public reactions fuel coordinated troll behavior.',
    ],
    evidenceToPreserve: [
      'Full-page screenshots showing sender usernames, handles, and complete message text.',
      'Direct URL links to every abusive post or comment thread.',
      'Record of dates and times each message was received.',
    ],
    recommendedNextSteps: [
      { label: 'Run Threat Intelligence Scan', to: '/analysis/threat' },
      { label: 'Prepare Complaint Letter', to: '/complaints' },
    ],
    severity: 'high',
  },
  {
    id: 'impersonation-clones',
    title: 'Fake Social Media Identities & Clones',
    category: 'Identity Misuse',
    shortDescription: 'Duplicating profile photos, bios, and names to solicit funds or deceive contacts.',
    whatItMeans:
      'Creating unauthorized accounts mimicking your identity to solicit money from your followers, distribute malicious links, or compromise your personal reputation.',
    howItWorks: [
      'Scammers copy your profile photo, display name, and bio text verbatim.',
      'A slightly modified handle (e.g. adding an extra underscore or number) is registered.',
      'Clone account follows your friend list and sends DMs soliciting emergency UPI transfers.',
    ],
    warningSigns: [
      'Contacts alerting you that they received a second friend request or message from "you".',
      'A profile with your photos asking people for investments, loans, or explicit conversations.',
      'An account created in the last 48 hours mirroring your publicly available images.',
    ],
    howToProtect: [
      'Keep follower and friend lists private to prevent scammers from targeting your contacts.',
      'Post a public disclaimer on your real account alerting contacts to the clone handle.',
      'Submit an official impersonation report directly through the platform’s grievance process.',
    ],
    evidenceToPreserve: [
      'Direct link to the imposter profile.',
      'Screenshot of the imposter’s bio, profile picture, and follower list.',
      'Screenshots from friends showing solicitations sent by the imposter.',
    ],
    recommendedNextSteps: [
      { label: 'Log Impersonation Incident', to: '/incidents/new' },
      { label: 'View Platform Takedown Portals', to: '/reporting' },
    ],
    severity: 'high',
  },
  {
    id: 'digital-blackmail',
    title: 'Digital Blackmail & Sextortion',
    category: 'Extortion',
    shortDescription: 'Threatening to leak private photos, chat logs, or synthetic media unless paid.',
    whatItMeans:
      'Coercion where a perpetrator threatens to release sensitive real or fabricated media to a victim’s family, employer, or public channels unless financial or sexual demands are met.',
    howItWorks: [
      'Perpetrator initiates contact via dating apps or video chats, recording private video.',
      'Alternatively, attacker uses deepfake generators to graft victim’s face onto adult media.',
      'Perpetrator sends screenshots of the victim’s contacts list demanding immediate wire transfer.',
    ],
    warningSigns: [
      'Demands for money within an aggressive countdown (e.g. "You have 2 hours or I send this").',
      'Collages showing your private photos next to screenshots of your family or workplace contacts.',
      'Insistence on cryptocurrency vouchers or non-refundable gift cards.',
    ],
    howToProtect: [
      'Never pay extortion money; paying universally leads to escalated secondary demands.',
      'Deactivate or lock your social accounts temporarily to sever the blackmailer’s contact list access.',
      'Reach out immediately to cybercrime authorities and trusted support networks.',
    ],
    evidenceToPreserve: [
      'Original threatening messages, payment demand addresses, and crypto wallet hashes.',
      'Complete phone numbers, email addresses, and chat platform handles used by the blackmailer.',
      'Do not delete message threads; export chats to preserve unedited message history.',
    ],
    recommendedNextSteps: [
      { label: 'Preserve Extortion Evidence', to: '/evidence' },
      { label: 'Prepare Police Cyber Cell Complaint', to: '/complaints' },
    ],
    severity: 'critical',
  },
  {
    id: 'recruitment-scams',
    title: 'Fake Job & Work-From-Home Scams',
    category: 'Financial Fraud',
    shortDescription: 'Deceptive job offers on Telegram or WhatsApp designed to steal deposits or identity.',
    whatItMeans:
      'Fraudulent recruitment campaigns promising high daily wages for reviewing YouTube videos, rating hotels, or data entry, which pivot into cryptocurrency investment extortion.',
    howItWorks: [
      'Victims receive unsolicited WhatsApp messages claiming to represent global HR firms.',
      'Initial micro-tasks pay small real amounts (₹200 - ₹500) to build false confidence.',
      'Victim is invited to "VIP tasks" requiring security deposits of ₹10,000 to ₹5,00,000 that are locked.',
    ],
    warningSigns: [
      'Job offers sent via WhatsApp or Telegram without formal interviews or domain email addresses.',
      'Requirement to pay "security deposits", "registration fees", or "crypto prepaid task balances".',
      'Promises of guaranteed daily returns exceeding 50% for trivial click tasks.',
    ],
    howToProtect: [
      'Verify company openings exclusively through official corporate career portals.',
      'Never deposit personal funds to unlock supposed earnings or commission rewards.',
      'Block and report unsolicited recruitment solicitations on WhatsApp immediately.',
    ],
    evidenceToPreserve: [
      'Bank transaction IDs (UTR numbers) and UPI VPA addresses where funds were transferred.',
      'Telegram channel screenshots and coordinator usernames.',
      'Fraudulent offer letters or fake job assignment spreadsheets.',
    ],
    recommendedNextSteps: [
      { label: 'Record in Case Tracker', to: '/cases' },
      { label: 'File Complaint on 1930', to: '/reporting' },
    ],
    severity: 'high',
  },
  {
    id: 'identity-misuse',
    title: 'Biometric & Identity Credential Misuse',
    category: 'Identity Misuse',
    shortDescription: 'Unauthorized use of Aadhaar, PAN, or biometrics to create fraudulent SIM cards.',
    whatItMeans:
      'Criminals utilizing harvested identity documents to register burner mobile SIM cards, open mule bank accounts, or bypass KYC checks in cyber attacks.',
    howItWorks: [
      'Scammers harvest photocopies of Aadhaar/PAN cards from unverified document portals.',
      'Fraudulent SIM cards are activated under the victim’s name without their knowledge.',
      'Mule numbers are used to orchestrate phishing campaigns or receive stolen funds.',
    ],
    warningSigns: [
      'Unexpected SMS notifications regarding loans or credit accounts you never initiated.',
      'Sudden loss of cellular network reception (potential SIM swap attack).',
      'Notice from telecom providers regarding extra phone numbers linked to your Aadhaar.',
    ],
    howToProtect: [
      'Use Masked Aadhaar (where only the last 4 digits are visible) for routine offline KYC.',
      'Lock Aadhaar biometrics through the official UIDAI mAadhaar app when not in use.',
      'Regularly check the Department of Telecommunications (TAFCOP) portal for numbers under your ID.',
    ],
    evidenceToPreserve: [
      'TAFCOP telecom connection reports showing unrecognized numbers.',
      'Unauthorized CIBIL or credit bureau enquiry notifications.',
      'Police non-cognizable reports (NCR) regarding lost physical identification cards.',
    ],
    recommendedNextSteps: [
      { label: 'Preserve Documentation', to: '/evidence' },
      { label: 'Log Identity Incident', to: '/incidents/new' },
    ],
    severity: 'medium',
  },
  {
    id: 'financial-fraud',
    title: 'Cyber Financial Fraud & Mule Banking',
    category: 'Financial Fraud',
    shortDescription: 'QR code deception, APK screen-sharing malware, and OTP compromise.',
    whatItMeans:
      'Technical or social manipulation resulting in unauthorized electronic fund transfers from victim bank accounts or digital payment wallets.',
    howItWorks: [
      'Seller on OLX or marketplace sends a QR code claiming "Scan this to receive your payment".',
      'Victim scans and enters their UPI PIN; entering a PIN always authorizes debits, never credits.',
      'Alternatively, victim is tricked into installing AnyDesk or QuickSupport granting screen control.',
    ],
    warningSigns: [
      'Any buyer claiming you must enter your UPI PIN to receive money into your account.',
      'Callers claiming your electricity bill or SIM card is expiring unless an APK is installed.',
      'Urgent requests to install third-party remote screen sharing applications.',
    ],
    howToProtect: [
      'Remember: You NEVER need to enter a UPI PIN to receive money into your account.',
      'Never download APK installation files sent over WhatsApp or third-party links.',
      'If compromised, call your bank immediately to freeze online banking and dial 1930 within the Golden Hour.',
    ],
    evidenceToPreserve: [
      'Bank statement highlighting unauthorized debits and 12-digit UTR numbers.',
      'Screenshot of fraudulent QR codes, payment links, and receiver VPA handles.',
      'Call recording or chat log with the fraudster.',
    ],
    recommendedNextSteps: [
      { label: 'National Cyber Crime 1930 Portal', to: '/reporting' },
      { label: 'Generate Formal Police Letter', to: '/complaints' },
    ],
    severity: 'critical',
  },
]

export interface ScamPattern {
  id: string
  title: string
  subtitle: string
  modusOperandi: string
  redFlags: string[]
  defensiveAction: string
  badgeText: string
  badgeVariant: 'critical' | 'warning' | 'primary' | 'safe'
}

export const KNOWN_SCAM_PATTERNS: ScamPattern[] = [
  {
    id: 'scam-digital-arrest',
    title: 'Fake Law Enforcement "Digital Arrest"',
    subtitle: 'High-pressure video call extortion posing as CBI, Mumbai Police or Customs',
    modusOperandi:
      'Victim receives an automated call alleging that a parcel containing narcotics or fraudulent passports has been seized in their name. The call is transferred to a fake police officer wearing a fabricated uniform inside a mock interrogation room over Skype. Victim is placed under fake "digital arrest" and ordered to transfer their entire savings to an "RBI verification account" under threat of physical incarceration.',
    redFlags: [
      'Demands that you stay on continuous 24-hour video surveillance without hanging up.',
      'Forged court arrest warrants with spelling mistakes or fabricated national emblems.',
      'Requirement to transfer personal funds to "verify" or "clear" your banking assets.',
    ],
    defensiveAction:
      'Immediately hang up. "Digital Arrest" does not exist under Indian Law. Police and judicial agencies never conduct arrests or interrogations via Skype/WhatsApp. Call 1930.',
    badgeText: 'Active High Alert',
    badgeVariant: 'critical',
  },
  {
    id: 'scam-voice-emergency',
    title: 'AI Voice Cloning Family Emergency',
    subtitle: 'Synthesized voice of child or sibling claiming car accident or detention',
    modusOperandi:
      'Scammers harvest audio clips from social media reels and synthesize a distress call to elderly parents. The synthesized voice cries and screams that they were arrested after a traffic collision and urgent bail money is needed within 15 minutes before their phone is confiscated.',
    redFlags: [
      'Severe emotional hysteria designed to block rational verification.',
      'Insistence on cash handoff or instant non-traceable UPI transfer to an unknown third party.',
      'Refusal to let you speak directly with the officer or doctor in charge.',
    ],
    defensiveAction:
      'Ask the caller for your predetermined family secret codeword. Disconnect and call the family member back directly on their normal cellular number.',
    badgeText: 'Emerging AI Threat',
    badgeVariant: 'warning',
  },
  {
    id: 'scam-romance-investment',
    title: 'Romance Baiting & Crypto Pig Butchering',
    subtitle: 'Fictitious romantic relationship pivoting into rigged investment platforms',
    modusOperandi:
      'Perpetrator matches on Instagram or dating platforms, spending weeks building deep emotional intimacy without meeting in person. The fraudster gradually introduces their "exclusive high-yield crypto arbitrage platform", showing falsified balance screenshots and encouraging the victim to invest larger sums that cannot be withdrawn.',
    redFlags: [
      'Matches who refuse to meet in person or conduct unscripted live video calls.',
      'Consistent steering of romantic conversations toward crypto trading or financial secrets.',
      'Withdrawal requests met with demands for "20% tax release fees" or "liquidity penalties".',
    ],
    defensiveAction:
      'Never send money or invest in third-party platforms recommended by online romantic interests. Check domain creation dates on WHOIS.',
    badgeText: 'Financial Extortion',
    badgeVariant: 'warning',
  },
  {
    id: 'scam-fake-recruitment',
    title: 'Part-Time Task & YouTube Rating Scam',
    subtitle: 'Work-from-home tasks paying ₹200 before trapping deposits in fake VIP tiers',
    modusOperandi:
      'Victims are approached on WhatsApp offering easy earnings for liking YouTube videos or hotel listings. Scammers pay initial ₹500 rewards into victim accounts, then migrate victims into Telegram groups where "crypto merchant tasks" demand ₹50,000 deposits to unlock accumulated rewards.',
    redFlags: [
      'Unsolicited job solicitations offering ₹3,000 - ₹8,000 per day for trivial click tasks.',
      'Communication conducted exclusively through encrypted Telegram groups.',
      'Demands that employees transfer money to employer accounts to upgrade tasks.',
    ],
    defensiveAction:
      'Legitimate employers never demand upfront money to perform work. Block sender numbers and report the bank accounts to 1930.',
    badgeText: 'Widespread Telegram Vector',
    badgeVariant: 'primary',
  },
  {
    id: 'scam-qr-olx',
    title: 'Marketplace QR Code Reverse Billing',
    subtitle: 'Buyer sends a QR code claiming "Scan this to accept payment into your account"',
    modusOperandi:
      'When listing furniture or gadgets on OLX, an eager buyer immediately agrees to buy without haggling. They claim to pay via Google Pay or PhonePe and send a QR code. When scanned, the QR code triggers a DEBIT request, draining funds when the victim enters their UPI PIN.',
    redFlags: [
      'Buyer refusing to inspect the item in person and offering immediate full advance payment.',
      'Claims that receiving money requires scanning a QR code or entering your security PIN.',
      'Screenshots of fake banking apps showing "Payment Approved, Scan to Accept".',
    ],
    defensiveAction:
      'Never enter your UPI PIN to receive money. Entering your PIN is only required to debit money from your own bank account.',
    badgeText: 'Common UPI Trap',
    badgeVariant: 'safe',
  },
  {
    id: 'scam-account-takeover',
    title: 'Social Media Session Hijacking & SIM Swap',
    subtitle: 'Phishing login pages or SMS OTP interception to hijack verified profiles',
    modusOperandi:
      'Victims receive phishing links disguised as copyright infringement warnings or verification badge updates from "Meta Security". Entering credentials hands over active session tokens, allowing attackers to change recovery emails, lock out victims, and extort contacts.',
    redFlags: [
      'DMs from accounts claiming to be official Instagram Support warning of 24h deletion.',
      'URLs using typosquatting domains (e.g. `meta-security-support-verify.com`).',
      'Sudden carrier alert that your SIM card is being activated on a new handset.',
    ],
    defensiveAction:
      'Enable hardware security keys or authenticator apps (TOTP) for 2FA instead of SMS. Never click external security links sent via social DMs.',
    badgeText: 'Credential Theft',
    badgeVariant: 'critical',
  },
]

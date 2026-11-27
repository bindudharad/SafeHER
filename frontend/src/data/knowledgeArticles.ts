export interface ArticleSection {
  id: string
  title: string
  content: string
  keyTakeaways?: string[]
  warningSigns?: string[]
  actionSteps?: string[]
}

export interface KnowledgeArticle {
  slug: string
  title: string
  category: ArticleCategory
  categoryLabel: string
  readingTime: string
  publishedDate: string
  author: {
    name: string
    role: string
    avatar?: string
  }
  summary: string
  heroDescription: string
  featured?: boolean
  imageUrl?: string
  sections: ArticleSection[]
  legalContext?: {
    act: string
    sections: string[]
    description: string
  }
  recommendedActions: {
    label: string
    to: string
    variant: 'primary' | 'secondary' | 'ghost'
  }[]
  sources: {
    title: string
    url?: string
    organization: string
  }[]
  tags: string[]
}

export type ArticleCategory =
  | 'deepfakes'
  | 'voice-cloning'
  | 'digital-arrest'
  | 'online-harassment'
  | 'impersonation'
  | 'cyber-blackmail'
  | 'social-media-safety'
  | 'evidence-preservation'
  | 'cybercrime-reporting'
  | 'ai-privacy'

export interface CategoryMetadata {
  id: ArticleCategory
  name: string
  description: string
  iconName: string
  color: string
}

export const KNOWLEDGE_CATEGORIES: CategoryMetadata[] = [
  {
    id: 'deepfakes',
    name: 'Deepfake Awareness',
    description: 'Understanding synthetic media, facial reenactment, and face swap manipulation tactics.',
    iconName: 'Image',
    color: '#d5ff54',
  },
  {
    id: 'voice-cloning',
    name: 'Voice Cloning',
    description: 'How neural audio synthesizers mimic loved ones in urgent distress scams.',
    iconName: 'Mic',
    color: '#a8db35',
  },
  {
    id: 'digital-arrest',
    name: 'Digital Arrest Scams',
    description: 'Combating psychological intimidation through fake law enforcement video calls.',
    iconName: 'ShieldAlert',
    color: '#ff927e',
  },
  {
    id: 'online-harassment',
    name: 'Online Harassment',
    description: 'Identifying persistent cyberstalking, coordinated trolling, and hate brigading.',
    iconName: 'Users',
    color: '#ff927e',
  },
  {
    id: 'impersonation',
    name: 'Identity Impersonation',
    description: 'Uncovering clone profiles, social engineering, and reputation hijacking.',
    iconName: 'UserX',
    color: '#d5ff54',
  },
  {
    id: 'cyber-blackmail',
    name: 'Cyber Blackmail',
    description: 'Safe response protocols for digital extortion, sextortion, and credential coercion.',
    iconName: 'Lock',
    color: '#ff927e',
  },
  {
    id: 'social-media-safety',
    name: 'Social Media Safety',
    description: 'Auditing platform privacy settings, audience segmentation, and leak vectors.',
    iconName: 'Share2',
    color: '#a8db35',
  },
  {
    id: 'evidence-preservation',
    name: 'Evidence Preservation',
    description: 'Best practices for court-admissible digital chain of custody under Section 65B.',
    iconName: 'HardDrive',
    color: '#d5ff54',
  },
  {
    id: 'cybercrime-reporting',
    name: 'Cybercrime Reporting',
    description: 'Official workflows for National Cyber Crime Portal (1930) and Platform Grievance Officers.',
    iconName: 'FileCheck',
    color: '#a8db35',
  },
  {
    id: 'ai-privacy',
    name: 'AI and Digital Privacy',
    description: 'Protecting your biometric baseline and personal data against AI training scrapers.',
    iconName: 'EyeOff',
    color: '#e2ff84',
  },
]

export const KNOWLEDGE_ARTICLES: KnowledgeArticle[] = [
  {
    slug: 'understanding-deepfakes-synthetic-media-threats',
    title: 'Deconstructing Deepfakes: How Generative AI Manipulates Facial Media',
    category: 'deepfakes',
    categoryLabel: 'Deepfake Awareness',
    readingTime: '6 min read',
    publishedDate: 'Nov 20, 2026',
    featured: true,
    imageUrl: '/assets/images/Hand_holding_magnifying_glass_ov..._202608261424.jpeg',
    author: {
      name: 'Dr. Radhika Varma',
      role: 'Forensic Media Specialist, SafeHER Research Lab',
    },
    summary:
      'Learn how diffusion models and GANs create hyper-realistic synthetic video, how to spot visual artifacts, and the forensic checks used in authenticating video evidence.',
    heroDescription:
      'Deepfake technology has progressed from clumsy face-swaps to high-resolution diffusion video pipelines. This guide arms individuals with the forensic literacy needed to spot anomalies and preserve digital proof.',
    sections: [
      {
        id: 'the-technology',
        title: '1. What Are Modern Deepfakes and How Are They Generated?',
        content:
          'Deepfakes rely on deep generative neural networks—primarily Generative Adversarial Networks (GANs) and latent diffusion architectures—to map a target persona onto source imagery or generate entirely synthetic facial motions. In non-consensual imagery, attackers typically harvest public portrait photos from Instagram or LinkedIn, aligning facial landmarks to synthesize synthetic likenesses.',
        keyTakeaways: [
          'GANs work by pitting a generator network against a discriminator network until synthetic imagery looks statistically plausible.',
          'Latent diffusion models produce higher-resolution textures, making surface-level visual inspection increasingly difficult.',
          'Most consumer deepfake tools still introduce temporal inconsistencies, warping seams, and lighting vector mismatches.',
        ],
      },
      {
        id: 'spotting-visual-anomalies',
        title: '2. Forensic Indicators: What Human Eyes and AI Vision Look For',
        content:
          'While algorithmic detectors evaluate mathematical frequency spectra and pixel covariance, human viewers can look for distinct physical discrepancies. Deepfake generators often struggle with fine boundaries, fluid dynamics, and biological involuntary reflexes.',
        warningSigns: [
          'Unnatural or absent eye blinking rates (either rigidly frozen or unnaturally rhythmic).',
          'Inconsistent ear jewelry, asymmetric eyeglass frames, or blurring where teeth meet gums.',
          'Lighting direction mismatches between the subject’s face and background environment.',
          'Odd warping around hair strands, collars, and skin-to-background edge boundaries during head rotations.',
        ],
      },
      {
        id: 'evidence-and-legal',
        title: '3. Legal Rights and Securing Evidence Under Indian Law',
        content:
          'Creating or distributing manipulated sexually explicit or defamatory imagery without consent is a severe criminal offense under the Information Technology Act 2000 and the Bharatiya Nyaya Sanhita (BNS). Under Section 66E of the IT Act, capturing or publishing private images without consent carries up to 3 years imprisonment.',
        actionSteps: [
          'Never delete the offending message or post immediately; take full-screen captures showing the timestamp, account URL, and platform header.',
          'Preserve original media files with cryptographic hashes (SHA-256) through the SafeHER Evidence Vault to guarantee tamper-proof admissibility.',
          'Run suspect media through the SafeHER Detect Media Verifier to generate forensic signal notes before filing an official grievance.',
        ],
      },
    ],
    legalContext: {
      act: 'Information Technology Act, 2000 & Bharatiya Nyaya Sanhita (BNS)',
      sections: ['Section 66E (Privacy Violation)', 'Section 67/67A (Obscene/Sexually Explicit Content)', 'Section 354D (Stalking)'],
      description: 'Criminalizes synthetic non-consensual depiction, unauthorized broadcast of private imagery, and digital stalking.',
    },
    recommendedActions: [
      { label: 'Scan Media in Detect Verifier', to: '/detect', variant: 'primary' },
      { label: 'Preserve Proof in Vault', to: '/evidence', variant: 'secondary' },
      { label: 'File Grievance Complaint', to: '/complaints', variant: 'ghost' },
    ],
    sources: [
      { title: 'Advisory on Deepfakes and Synthetic Misinformation', organization: 'Ministry of Electronics and Information Technology (MeitY)' },
      { title: 'Guidelines on Media Authentication and Integrity', organization: 'CERT-In / Cyber Swachhta Kendra' },
    ],
    tags: ['Deepfakes', 'Synthetic Media', 'Forensics', 'Facial Recognition', 'IT Act 66E'],
  },
  {
    slug: 'voice-cloning-family-emergency-scams',
    title: 'Voice Cloning Scams: Protecting Your Family Against AI Audio Impersonation',
    category: 'voice-cloning',
    categoryLabel: 'Voice Cloning',
    readingTime: '5 min read',
    publishedDate: 'Nov 18, 2026',
    imageUrl: '/assets/images/3.jpg',
    author: {
      name: 'Pooja Hegde',
      role: 'Cybersecurity Threat Intelligence Analyst',
    },
    summary:
      'Scammers now need as little as 3 seconds of recorded audio to clone a loved one’s voice. Understand how emergency voice extortion works and how family safety duress words stop attacks.',
    heroDescription:
      'With neural text-to-speech (TTS) engines, attackers can replicate vocal timbre, inflections, and emotional cadence with frightening accuracy. Here is how to safeguard your household.',
    sections: [
      {
        id: 'voice-attack-vector',
        title: '1. How Voice Cloning Extortion Works',
        content:
          'Attackers scrape short audio snippets from public social media reels, WhatsApp status videos, or voicemail greetings. Using fast voice cloning APIs, they feed scripted emergency messages into the model and call parents or siblings claiming the victim was arrested, in a car collision, or held hostage.',
        keyTakeaways: [
          'Attackers rely on extreme emotional panic so victims act before verifying facts.',
          'Audio often contains simulated background noises like sirens or crying to obscure subtle synthesizer artifacts.',
          'Urgent demands for instant UPI, crypto, or cash transfer are universally present.',
        ],
      },
      {
        id: 'family-code-word',
        title: '2. The "Family Safe Word" Protocol',
        content:
          'The most effective immediate defense against voice cloning is a predetermined family verification codeword that is never spoken over public calls, never shared in group chats, and memorized only in person.',
        actionSteps: [
          'Agree on a unique private family codeword known exclusively by immediate relatives.',
          'If you receive an alarming call from a loved one demanding emergency money, calmly ask for the safe word.',
          'Hang up immediately and call back using their known standard phone number over cellular networks—do not rely on returning incoming VoIP calls.',
        ],
      },
    ],
    legalContext: {
      act: 'Indian Penal Code / Bharatiya Nyaya Sanhita',
      sections: ['Section 419/420 (Cheating by Impersonation)', 'Section 384/386 (Extortion)'],
      description: 'Extortion and criminal deception through impersonation are punishable by rigorous imprisonment and fines.',
    },
    recommendedActions: [
      { label: 'Log Voice Threat Incident', to: '/incidents/new', variant: 'primary' },
      { label: 'Review Threat Intelligence', to: '/analysis/threat', variant: 'secondary' },
    ],
    sources: [
      { title: 'National Cyber Crime Awareness Notice on AI Voice Frauds', organization: 'Indian Cyber Crime Coordination Centre (I4C)' },
    ],
    tags: ['Voice Cloning', 'AI Audio', 'Extortion', 'Family Security', 'UPI Scams'],
  },
  {
    slug: 'digital-arrest-scams-psychological-intimidation',
    title: 'Combating "Digital Arrest" Scams: Anatomy of Law Enforcement Impersonation',
    category: 'digital-arrest',
    categoryLabel: 'Digital Arrest Scams',
    readingTime: '7 min read',
    publishedDate: 'Nov 15, 2026',
    imageUrl: '/assets/images/Wireframe_detecting_deepfake_on_..._202608261421.jpeg',
    author: {
      name: 'Adv. Suresh Narayanan',
      role: 'Cyber Law Advocate & Digital Safety Advisor',
    },
    summary:
      'Fraud syndicates pose as police, CBI, ED, or customs officers on Skype and WhatsApp video calls to place citizens under fake "digital arrest." Learn why this has zero legal validity in India.',
    heroDescription:
      'The Supreme Court of India, Ministry of Home Affairs, and MeitY have unambiguously confirmed: "Digital Arrest" does not exist under Indian criminal procedure. Learn to dismantle this intimidation.',
    sections: [
      {
        id: 'no-legal-digital-arrest',
        title: '1. Fact: Indian Law Does Not Recognize "Digital Arrest"',
        content:
          'Under the Code of Criminal Procedure (CrPC) and Bharatiya Nagarik Suraksha Sanhita (BNSS), an arrest requires physical custody, formal written memos with officer identification, and immediate notification of relatives. No court, police station, or investigative agency in India conducts trial proceedings or arrests via Skype, WhatsApp, or Google Meet.',
        warningSigns: [
          'Callers claiming to be from FedEx, Customs, CBI, or Mumbai Police alleging an illegal contraband package in your name.',
          'Demands that you remain on 24/7 video call without disconnecting or contacting family.',
          'Faked official logos, police badges, and forged court seals displayed in backgrounds.',
          'Orders to transfer money to "Reserve Bank verification accounts" to clear your name.',
        ],
      },
      {
        id: 'immediate-response',
        title: '2. Immediate Response When Targeted',
        content:
          'Do not negotiate or justify yourself. Terminate the call immediately. You cannot be arrested over the internet. Dial 1930 or submit an immediate report at cybercrime.gov.in.',
        actionSteps: [
          'Disconnect the video call immediately; block the phone numbers.',
          'Record screenshot proof of the caller IDs and preserve any forged PDFs sent to you in SafeHER Evidence Vault.',
          'Alert your local cyber crime police unit or call the National Cyber Crime Helpline at 1930.',
        ],
      },
    ],
    legalContext: {
      act: 'Bharatiya Nagarik Suraksha Sanhita (BNSS) & IT Act',
      sections: ['Section 41 (Arrest Procedure)', 'Section 66D IT Act (Cheating by Impersonation)'],
      description: 'Strict statutory procedures govern physical arrest. Falsely posing as public servants is a severe non-bailable offense.',
    },
    recommendedActions: [
      { label: 'Report Incident to Vault', to: '/incidents/new', variant: 'primary' },
      { label: 'View Helpline Directory', to: '/reporting', variant: 'secondary' },
    ],
    sources: [
      { title: 'Prime Minister & Home Ministry Public Alert on Digital Arrest Scams', organization: 'Ministry of Home Affairs (MHA)' },
      { title: 'Advisory on Fraudulent Law Enforcement Video Calls', organization: 'I4C Cyberdost' },
    ],
    tags: ['Digital Arrest', 'Law Enforcement Fraud', 'CBI Impersonation', 'Cyber Crime 1930', 'Phishing'],
  },
  {
    slug: 'preserving-digital-evidence-section-65b',
    title: 'Preserving Court-Admissible Evidence Under Section 65B of Indian Evidence Act',
    category: 'evidence-preservation',
    categoryLabel: 'Evidence Preservation',
    readingTime: '6 min read',
    publishedDate: 'Nov 12, 2026',
    imageUrl: '/assets/images/Digital_fingerprints_transition_..._2K_202608261423.jpeg',
    author: {
      name: 'Dr. Radhika Varma',
      role: 'Forensic Media Specialist, SafeHER Research Lab',
    },
    summary:
      'Digital evidence like WhatsApp chats, social media screenshots, and emails can easily be rejected in court unless certified properly. Understand cryptographic hashing and Section 65B rules.',
    heroDescription:
      'A screenshot alone is often dismissed as easily fabricated unless backed by hash certificates and chain-of-custody documentation. Here is how SafeHER enforces legal readiness from day one.',
    sections: [
      {
        id: 'what-is-65b',
        title: '1. Why Cryptographic Hashes Are Critical in Cyber Admissibility',
        content:
          'Under Section 65B of the Indian Evidence Act (and Section 63 of Bharatiya Sakshya Adhiniyam), secondary electronic records require proof that the contents remained unaltered from the moment of capture. Calculating an instantaneous SHA-256 fingerprint freezes the bitstream signature of the file.',
        keyTakeaways: [
          'SHA-256 creates a unique 64-character hexadecimal digest representing the exact file content.',
          'Even changing a single pixel or comma changes the entire resulting hash completely (the avalanche effect).',
          'A verifiable hash proves in court that the evidence was not edited between the incident date and trial.',
        ],
      },
      {
        id: 'preservation-checklist',
        title: '2. Step-by-Step Evidence Preservation Checklist',
        content:
          'When subjected to harassment or threats, capturing evidence accurately before the perpetrator deletes their account or messages is essential.',
        actionSteps: [
          'Capture full screen images including device time, battery status, URL bar, and profile handles.',
          'Export uncompressed chat logs (`.txt`) directly through platform export settings where possible.',
          'Immediately upload records into the SafeHER Evidence Vault to generate an instantaneous timestamped SHA-256 certificate.',
          'Do not use image editing or filter apps to highlight text, as this invalidates the original cryptographic hash.',
        ],
      },
    ],
    legalContext: {
      act: 'Indian Evidence Act, 1872 & Bharatiya Sakshya Adhiniyam, 2023',
      sections: ['Section 65B (Admissibility of Electronic Records)', 'Section 63 BSA (Electronic Evidence Certificate)'],
      description: 'Establishes mandatory certification requirements for computer outputs and digital evidence in judicial proceedings.',
    },
    recommendedActions: [
      { label: 'Open Digital Evidence Vault', to: '/evidence', variant: 'primary' },
      { label: 'Generate Complaint with Certificate', to: '/complaints', variant: 'secondary' },
    ],
    sources: [
      { title: 'Arjun Panditrao Khotkar v. Kailash Kushanrao Gorantyal (Supreme Court Ruling on 65B)', organization: 'Supreme Court of India' },
    ],
    tags: ['Section 65B', 'Cryptographic Hashes', 'SHA-256', 'Forensics', 'Court Evidence'],
  },
  {
    slug: 'online-harassment-cyberstalking-response-guide',
    title: 'Recognizing and Halting Cyberstalking, Doxxing, and Coordinated Harassment',
    category: 'online-harassment',
    categoryLabel: 'Online Harassment',
    readingTime: '5 min read',
    publishedDate: 'Nov 09, 2026',
    imageUrl: '/assets/images/5.jpg',
    author: {
      name: 'Pooja Hegde',
      role: 'Cybersecurity Threat Intelligence Analyst',
    },
    summary:
      'Practical protocols when facing persistent abuse across multiple social platforms, including audience isolation, account privacy lockdown, and takedown notices.',
    heroDescription:
      'Cyberstalking rarely stays confined to one platform. Attackers pivot across Instagram, LinkedIn, and messaging apps to overwhelm victims. Here is your structured counter-response.',
    sections: [
      {
        id: 'identifying-patterns',
        title: '1. Doxxing and Coordinated Trolling Patterns',
        content:
          'Doxxing involves releasing private identifying information—such as personal phone numbers, workplace locations, or residential addresses—online to encourage third-party harassment. When combined with bot brigades, it creates artificial viral pressure designed to silence victims.',
        warningSigns: [
          'Multiple newly created accounts commenting identical abusive scripts on your posts.',
          'Unsolicited OTP requests or password reset emails arriving simultaneously on your phone.',
          'Strangers contacting your friends, colleagues, or family members with private gossip.',
        ],
      },
      {
        id: 'counter-measures',
        title: '2. Immediate Lockdown Checklist',
        content:
          'Take defensive action without giving attackers emotional feedback. Silence notification channels and document every violation.',
        actionSteps: [
          'Switch all social profiles to Private; restrict comments exclusively to approved followers.',
          'Revoke access for third-party OAuth apps connected to your accounts in Settings.',
          'Save all abusive messages and URL profiles to SafeHER before blocking perpetrators.',
          'Draft an immediate grievance notice for platform Grievance Officers requesting 24-hour takedown.',
        ],
      },
    ],
    legalContext: {
      act: 'Indian Penal Code / Bharatiya Nyaya Sanhita & IT Act',
      sections: ['Section 354D (Stalking)', 'Section 509 (Insulting Modesty of Women)', 'Section 66E IT Act'],
      description: 'Protects citizens from persistent online following, monitoring, and intimidation.',
    },
    recommendedActions: [
      { label: 'Log Incident in SafeHER', to: '/incidents/new', variant: 'primary' },
      { label: 'Draft Grievance Notice', to: '/complaints', variant: 'secondary' },
    ],
    sources: [
      { title: 'Guidelines for Cyber Safety of Women and Children', organization: 'National Commission for Women (NCW)' },
    ],
    tags: ['Cyberstalking', 'Doxxing', 'Harassment', 'Social Privacy', 'IT Rules 2021'],
  },
  {
    slug: 'cybercrime-reporting-portal-1930-complete-guide',
    title: 'Step-by-Step Filing: National Cyber Crime Portal (cybercrime.gov.in) & 1930 Helpline',
    category: 'cybercrime-reporting',
    categoryLabel: 'Cybercrime Reporting',
    readingTime: '8 min read',
    publishedDate: 'Nov 05, 2026',
    imageUrl: '/assets/images/Verifying_human_presence_using_t..._202608261423.jpeg',
    author: {
      name: 'Adv. Suresh Narayanan',
      role: 'Cyber Law Advocate & Digital Safety Advisor',
    },
    summary:
      'A comprehensive walkthrough of filing complaints on the Indian Government’s National Cybercrime Reporting Portal, emergency freezing on 1930, and jurisdictional follow-up.',
    heroDescription:
      'Understanding how police cyber cells triage incoming reports can save critical hours. Learn the exact category to select, what documents to attach, and how to track your complaint.',
    sections: [
      {
        id: 'choosing-category',
        title: '1. Navigating the Official Cybercrime Portal Categories',
        content:
          'When filing on cybercrime.gov.in, complaints are partitioned into two primary tracks: "Report Crime Against Women/Children" (which allows anonymous reporting or registered citizen filing) and "Report Other Cyber Crime" (financial frauds, malware, hacking). Filing under the correct track ensures immediate routing to specialized cyber officers.',
        keyTakeaways: [
          'Women and child abuse complaints receive accelerated statutory prioritization under Indian cyber guidelines.',
          'Financial frauds must be reported to the national 1930 helpline within the "Golden Hour" (first 2-4 hours) to freeze bank accounts.',
          'You will receive an official Acknowledgement Number (e.g. `2026/...`) that you can record directly in the SafeHER Case Tracker.',
        ],
      },
      {
        id: 'what-to-attach',
        title: '2. Required Attachments and Dossier Formatting',
        content:
          'Police officers review hundreds of filings daily. A clean, chronological complaint with indexed evidence significantly increases the probability of an FIR being registered.',
        actionSteps: [
          'Generate your formal SafeHER Complaint Draft containing structured facts, platform URLs, and Section 65B hash digests.',
          'Export evidence files and convert screenshots to PDF format under the portal’s 10MB individual file size limit.',
          'Save your filing acknowledgement number and schedule a reminder in SafeHER Case Tracking to follow up with your local cyber cell after 48 hours.',
        ],
      },
    ],
    legalContext: {
      act: 'Ministry of Home Affairs Guidelines & IT Rules',
      sections: ['Cyber Crime Reporting Framework', 'Citizen Financial Cyber Fraud Reporting System (CFCFRS)'],
      description: 'Coordinates state police cyber cells with national banks and social media platforms for rapid remediation.',
    },
    recommendedActions: [
      { label: 'Generate Formal Complaint', to: '/complaints', variant: 'primary' },
      { label: 'Track Filing in Case Tracker', to: '/cases', variant: 'secondary' },
      { label: 'View Verified Portal Links', to: '/reporting', variant: 'ghost' },
    ],
    sources: [
      { title: 'Standard Operating Procedures for Cyber Crime Complaints', organization: 'Ministry of Home Affairs (cybercrime.gov.in)' },
    ],
    tags: ['Cyber Crime Portal', 'Helpline 1930', 'FIR Filing', 'Police Procedure', 'Case Tracking'],
  },
]

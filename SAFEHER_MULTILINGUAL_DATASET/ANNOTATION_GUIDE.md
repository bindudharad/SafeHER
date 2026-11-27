# SafeHER Multilingual Annotation Guide (`v1.0.0`)

## 1. Multi-Label Principle
A single message may belong to multiple threat categories simultaneously. Annotators assign:
- `primary_category`: The dominant legal/safety risk (e.g., `FINANCIAL_EXTORTION` if money is demanded under threat).
- `secondary_categories`: All co-occurring categories (e.g., `["BLACKMAIL", "NON_CONSENSUAL_IMAGE_THREAT"]`).

## 2. Category Definitions & Boundaries
- **`BENIGN`**: Everyday communication, including messages containing sensitive keywords in harmless contexts (e.g., "I transferred lunch money via UPI", "share the project photos", "waiting near the police station").
- **`INSULT`**: Profanity, name-calling, or disrespect without threats, stalking, extortion, or sustained harassment.
- **`HARASSMENT`**: Repeated unwanted contact, intimidation, or persistent targeting ("I will keep messaging you every day even if you block me").
- **`CYBERSTALKING`**: Surveillance, tracking physical location/routines, monitoring online activity ("I saw you leave for work at 8:30 AM").
- **`DIRECT_THREAT`**: Explicit threat of physical harm, violence, or death.
- **`BLACKMAIL`**: Coercive threat to expose secrets, reputation, or private information unless demands are met.
- **`FINANCIAL_EXTORTION`**: Demanding money, UPI transfer, cash, or cryptocurrency under threat.
- **`SEXUAL_HARASSMENT`**: Unwanted sexual propositions, lewd remarks, or requests for explicit media/acts.
- **`NON_CONSENSUAL_IMAGE_THREAT`**: Threatening to leak, upload, morph, or circulate intimate/private photos or videos.
- **`COERCION`**: Forcing the recipient to act against their will (e.g., delete accounts, meet in person, stay on webcam).
- **`IMPERSONATION_OR_SOCIAL_ENGINEERING`**: Posing as cyber police, bank officials, or authorities ("digital arrest warrant", OTP phishing).
- **`OTHER_ABUSE`**: Doxxing (publishing home address/phone), defamation, or other abusive conduct.

## 3. Severity Levels
- `LOW`: Benign or isolated mild insult without threat/coercion.
- `MODERATE`: Ambiguous threat, repeated insult, or phishing/impersonation without immediate physical/NCII threat.
- `HIGH`: Clear harassment, cyberstalking, sexual harassment, or impersonation with coercion.
- `URGENT_REVIEW`: Direct physical violence threat, blackmail, financial extortion, or non-consensual intimate image threat.

## 4. Quality & Adjudication Protocol
- Fluent Kannada, Hindi, and English reviewers should independently label new samples.
- Disagreements are resolved by adjudication and logged with `ambiguity_status: "ambiguous"` and lower `annotation_confidence`.
- Machine translation alone is NOT permitted to generate Kannada or code-mixed evaluation data without native speaker review.

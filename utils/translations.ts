export const translations = {
  en: {
    welcome: "Welcome to FinAI Bank. I am your advanced digital loan assistant. Before we begin, I must inform you that your data is securely processed according to banking regulations.",
    proceedRequest: "Shall we proceed with your application?",
    nameRequest: "Excellent. May I have your full name as per your official documents?",
    loanTypeRequest: "Hello {name}, what type of loan are you looking for today?",
    incomeRequest: "To customize your offer, what is your net monthly income? (e.g., 50000)",
    emiRequest: "Do you have any existing monthly EMIs? If yes, please enter the total amount. If none, enter 0.",
    creditScoreRequest: "What is your approximate credit score? This helps us personalize your offer.",
    creditScoreAdvisory: "Noted. You may still be eligible, though interest rates might be slightly adjusted based on credit history.",
    invalidIncome: "Please enter a valid monthly income (minimum 5000).",
    offersGenerated: "Based on your income of ₹{income} and eligibility score of {score}, I have generated these personalized offers for you:",
    rejection: "I'm sorry, but based on the provided financial details, we cannot offer you a loan at this time due to eligibility criteria.",
    selectOffer: "Please select one of the loan offers above to proceed.",
    mobileRequest: "Great choice! To issue your sanction letter, we need to verify your identity. Please enter your Mobile Number to begin.",
    invalidMobile: "Please enter a valid 10-digit mobile number.",
    kycStart: "Thank you. Initiating secure KYC verification protocol.\n\nPlease provide your PAN Number and upload your ID proof securely.",
    kycSuccess: "KYC Documents Verified Successfully. \n\nI have sent a One-Time Password (OTP) to your mobile number. Please enter '1234' to confirm.",
    kycFail: "KYC Verification Failed. Your identity could not be verified automatically.",
    otpSuccess: "Identity Verified Successfully! \n\nI am now generating your Provisional Sanction Letter.",
    otpFail: "Incorrect OTP. Please try again.",
    locked: "Maximum verification attempts exceeded. For security reasons, this session is now locked.",
    buttons: {
      yes: "Yes, Proceed",
      restart: "Restart Application",
      personal: "Personal Loan",
      home: "Home Loan",
      business: "Business Loan",
      education: "Education Loan"
    },
    creditScore: {
      excellent: "Excellent (750+)",
      good: "Good (700-749)",
      fair: "Fair (650-699)",
      poor: "Poor (<650)",
      unknown: "I don't know"
    }
  },
  hi: {
    welcome: "FinAI बैंक में आपका स्वागत है। मैं आपका उन्नत डिजिटल ऋण सहायक हूं। शुरू करने से पहले, आपकी जानकारी बैंकिंग नियमों के अनुसार सुरक्षित रूप से संसाधित की जाएगी।",
    proceedRequest: "क्या हम आपके आवेदन के साथ आगे बढ़ें?",
    nameRequest: "बहुत बढ़िया। क्या मैं आपका पूरा नाम जान सकता हूँ?",
    loanTypeRequest: "नमस्ते {name}, आज आप किस प्रकार का ऋण देख रहे हैं?",
    incomeRequest: "आपकी आय के आधार पर ऑफर बनाने के लिए, आपकी मासिक आय क्या है? (जैसे, 50000)",
    emiRequest: "क्या आपकी कोई मौजूदा मासिक EMI है? यदि हाँ, तो कुल राशि दर्ज करें। यदि नहीं, तो 0 दर्ज करें।",
    invalidIncome: "कृपया एक वैध मासिक आय दर्ज करें (न्यूनतम 5000)।",
    offersGenerated: "आपकी ₹{income} की आय और {score} के पात्रता स्कोर के आधार पर, मैंने आपके लिए ये ऑफर तैयार किए हैं:",
    rejection: "मुझे खेद है, लेकिन प्रदान किए गए वित्तीय विवरणों के आधार पर, हम इस समय आपको ऋण प्रदान नहीं कर सकते।",
    selectOffer: "कृपया आगे बढ़ने के लिए ऊपर दिए गए ऋण प्रस्तावों में से एक का चयन करें।",
    mobileRequest: "बेहतरीन चुनाव! अपना स्वीकृति पत्र जारी करने के लिए, हमें आपकी पहचान सत्यापित करनी होगी। कृपया अपना मोबाइल नंबर दर्ज करें।",
    invalidMobile: "कृपया एक मान्य 10-अंकीय मोबाइल नंबर दर्ज करें।",
    kycStart: "धन्यवाद। सुरक्षित KYC सत्यापन शुरू किया जा रहा है।\n\nकृपया अपना पैन नंबर प्रदान करें और अपना आईडी प्रूफ सुरक्षित रूप से अपलोड करें।",
    kycSuccess: "KYC दस्तावेज़ सफलतापूर्वक सत्यापित हुए। \n\nमैंने आपके मोबाइल नंबर पर एक वन-टाइम पासवर्ड (OTP) भेजा है। पुष्टि करने के लिए कृपया '1234' दर्ज करें।",
    kycFail: "KYC सत्यापन विफल रहा। आपकी पहचान स्वचालित रूप से सत्यापित नहीं की जा सकी।",
    otpSuccess: "पहचान सफलतापूर्वक सत्यापित हुई! \n\nमैं अब आपका अनंतिम स्वीकृति पत्र (Sanction Letter) तैयार कर रहा हूँ।",
    otpFail: "गलत OTP। कृपया पुनः प्रयास करें।",
    locked: "अधिकतम सत्यापन प्रयास समाप्त हो गए। सुरक्षा कारणों से, यह सत्र अब लॉक कर दिया गया है।",
    creditScoreRequest: "आपका अनुमानित क्रेडिट स्कोर क्या है? यह हमें आपके ऑफ़र को व्यक्तिगत बनाने में मदद करता है।",
    creditScoreAdvisory: "नोट किया गया। आप अभी भी पात्र हो सकते हैं, हालांकि क्रेडिट इतिहास के आधार पर ब्याज दरों में थोड़ा समायोजन किया जा सकता है।",
    buttons: {
      yes: "हाँ, आगे बढ़ें",
      restart: "पुनः आरंभ करें",
      personal: "व्यक्तिगत ऋण",
      home: "गृह ऋण",
      business: "व्यापार ऋण",
      education: "शिक्षा ऋण"
    },
    creditScore: {
      excellent: "उत्कृष्ट (750+)",
      good: "अच्छा (700-749)",
      fair: "निष्पक्ष (650-699)",
      poor: "खराब (<650)",
      unknown: "मुझे नहीं पता"
    }
  }
};

export const getTranslation = (lang: 'en' | 'hi', key: string, params?: Record<string, string | number>) => {
  const keys = key.split('.');
  let value: any = translations[lang];
  for (const k of keys) {
    if (value) value = value[k];
  }
  
  if (!value) return key;

  if (params) {
    return Object.entries(params).reduce((acc, [k, v]) => {
      return acc.replace(`{${k}}`, String(v));
    }, value);
  }
  return value;
};
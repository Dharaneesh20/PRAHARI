import React, { createContext, useContext, useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export interface TourStep {
  selector: string;
  path?: string;
  titleEn: string;
  titleKn: string;
  textEn: string;
  textKn: string;
  catalystEn?: string;
  catalystKn?: string;
  serviceName?: string;
  placement?: "top" | "bottom" | "left" | "right" | "center";
  onNext?: () => void | Promise<void>;
}

interface TourContextType {
  isOpen: boolean;
  stepIndex: number;
  steps: TourStep[];
  startTour: () => void;
  nextStep: () => Promise<void>;
  prevStep: () => void;
  skipTour: () => void;
  setIsOpen: (open: boolean) => void;
  setStepIndex: (index: number) => void;
}

const TourContext = createContext<TourContextType | undefined>(undefined);

export const steps: TourStep[] = [
  {
    selector: "#tour-logo-header",
    path: "/login",
    titleEn: "Welcome to Prahari AI",
    titleKn: "ಪ್ರಹರಿ AI ಗೆ ಸ್ವಾಗತ",
    textEn: "Prahari AI is the Tactical Intelligence & Predictive Routing Platform for the Karnataka Police. Let's take a quick tour to learn the layout!",
    textKn: "ಪ್ರಹರಿ AI ಕರ್ನಾಟಕ ಪೊಲೀಸ್‌ನ ಯುದ್ಧತಂತ್ರದ ಬುದ್ಧಿಮತ್ತೆ ಮತ್ತು ಮುನ್ಸೂಚಕ ರೂಟಿಂಗ್ ವೇದಿಕೆಯಾಗಿದೆ. ವಿನ್ಯಾಸವನ್ನು ತಿಳಿಯಲು ತ್ವರಿತ ಪ್ರವಾಸವನ್ನು ಕೈಗೊಳ್ಳೋಣ!",
    catalystEn: "Hosted using App Sail Compute and Zia Slate microservices runtime.",
    catalystKn: "ಆಪ್ ಸೈಲ್ ಕಂಪ್ಯೂಟ್ ಮತ್ತು ಜಿಯಾ ಸ್ಲೇಟ್ ಮೈಕ್ರೋಸರ್ವಿಸಸ್ ಚಾಲನಾಸಮಯ ಬಳಸಿ ಹೋಸ್ಟ್ ಮಾಡಲಾಗಿದೆ.",
    serviceName: "App Sail Compute & Zia Slate",
    placement: "bottom",
  },
  {
    selector: "#tour-catalyst-auth",
    path: "/login",
    titleEn: "Secure Authorization & RBAC",
    titleKn: "ಸುರಕ್ಷಿತ ದೃಢೀಕರಣ ಮತ್ತು ಪಾತ್ರ ನಿಯಂತ್ರಣ",
    textEn: "Platform security is managed through Zia OAuth. It validates badge IDs and enforces scoped privileges (L1 to L3).",
    textKn: "ವೇದಿಕೆಯ ಭದ್ರತೆಯನ್ನು ಜಿಯಾ ಓಆಥ್ (Zia OAuth) ಮೂಲಕ ನಿರ್ವಹಿಸಲಾಗುತ್ತದೆ. ಇದು ಬ್ಯಾಡ್ಜ್ ಐಡಿಗಳನ್ನು ಪರಿಶೀಲಿಸುತ್ತದೆ ಮತ್ತು ಅನುಮತಿಗಳನ್ನು ಜಾರಿಗೊಳಿಸುತ್ತದೆ.",
    catalystEn: "Enforces Role-Based Access Control (RBAC) across officers using Zia OAuth integration.",
    catalystKn: "ಜಿಯಾ ಓಆಥ್ ಸಂಯೋಜನೆಯ ಮೂಲಕ ಅಧಿಕಾರಿಗಳಾದ್ಯಂತ ಪಾತ್ರ-ಆಧಾರಿತ ಪ್ರವೇಶ ನಿಯಂತ್ರಣವನ್ನು (RBAC) ಜಾರಿಗೊಳಿಸುತ್ತದೆ.",
    serviceName: "Zia OAuth",
    placement: "bottom",
  },
  {
    selector: "#tour-demo-toggle",
    path: "/login",
    titleEn: "Demo Profiles Panel",
    titleKn: "ಡೆಮೊ ಪ್ರೊಫೈಲ್‌ಗಳ ಫಲಕ",
    textEn: "Click this toggle to show/hide pre-configured demo profiles for testing various platform clearings.",
    textKn: "ವಿವಿಧ ಕ್ಲಿಯರೆನ್ಸ್‌ಗಳನ್ನು ಪರೀಕ್ಷಿಸಲು ಪೂರ್ವ-ಕಾನ್ಫಿಗರ್ ಮಾಡಲಾದ ಡೆಮೊ ಪ್ರೊಫೈಲ್‌ಗಳನ್ನು ತೋರಿಸಲು/ಮರೆಮಾಡಲು ಈ ಟಾಗಲ್ ಕ್ಲಿಕ್ ಮಾಡಿ.",
    catalystEn: "Simulates Karnataka Police hierarchy from L1 Field Officer to L3 Super Admin via Zia OAuth simulations.",
    catalystKn: "ಜಿಯಾ ಓಆಥ್ ಸಿಮ್ಯುಲೇಶನ್ ಮೂಲಕ ಎಲ್ 1 ಫೀಲ್ಡ್ ಆಫೀಸರ್‌ನಿಂದ ಎಲ್ 3 ಸೂಪರ್ ಅಡ್ಮಿನ್‌ವರೆಗೆ ಪೊಲೀಸ್ ಶ್ರೇಣಿಯನ್ನು ಅನುಕರಿಸುತ್ತದೆ.",
    serviceName: "Zia OAuth Simulation",
    placement: "top",
    onNext: () => {
      const el = document.getElementById("tour-demo-toggle") as HTMLButtonElement;
      if (el && el.textContent?.toLowerCase().includes("show")) {
        el.click();
      }
    }
  },
  {
    selector: "#tour-login-btn",
    path: "/login",
    titleEn: "Secure Uplink (Login)",
    titleKn: "ಸುರಕ್ಷಿತ ಅಪ್‌ಲಿಂಕ್ (ಲಾಗಿನ್)",
    textEn: "Initiating uplink connects the command terminal. Clicking 'Next' will auto-select the Super Admin profile and perform a secure login.",
    textKn: "ಅಪ್‌ಲಿಂಕ್ ಅನ್ನು ಪ್ರಾರಂಭಿಸುವುದರಿಂದ ಕಮಾಂಡ್ ಟರ್ಮಿನಲ್ ಸಂಪರ್ಕಗೊಳ್ಳುತ್ತದೆ. 'ಮುಂದೆ' ಕ್ಲಿಕ್ ಮಾಡಿದರೆ ಸೂಪರ್ ಅಡ್ಮಿನ್ ಪ್ರೊಫೈಲ್ ಅನ್ನು ಆಯ್ಕೆ ಮಾಡಿ ಲಾಗ್ ಇನ್ ಆಗುತ್ತದೆ.",
    catalystEn: "Secures authentication endpoints under TLS 1.3 standards and Zia OAuth tokens.",
    catalystKn: "ಟಿಎಲ್ಎಸ್ 1.3 ಮಾನದಂಡಗಳು ಮತ್ತು ಜಿಯಾ ಓಆಥ್ ಟೋಕನ್‌ಗಳ ಅಡಿಯಲ್ಲಿ ದೃಢೀಕರಣದ ಎಂಡ್ಪಾಯಿಂಟ್ಗಳನ್ನು ಸುರಕ್ಷಿತಗೊಳಿಸುತ್ತದೆ.",
    serviceName: "Zia OAuth Gateway",
    placement: "top",
    onNext: () => {
      const adminBtn = document.getElementById("tour-demo-super-admin") as HTMLButtonElement;
      if (adminBtn) {
        adminBtn.click();
        setTimeout(() => {
          const submitBtn = document.getElementById("tour-login-btn") as HTMLButtonElement;
          if (submitBtn) submitBtn.click();
        }, 200);
      }
    }
  },
  {
    selector: "#tour-dashboard-header",
    path: "/dashboard",
    titleEn: "Tactical Overview",
    titleKn: "ಯುದ್ಧತಂತ್ರದ ಅವಲೋಕನ",
    textEn: "Monitor active crime cases, emergency alerts, response averages, and risk zones across Karnataka.",
    textKn: "ಕರ್ನಾಟಕದಾದ್ಯಂತ ಸಕ್ರಿಯ ಅಪರಾಧ ಪ್ರಕರಣಗಳು, ತುರ್ತು ಎಚ್ಚರಿಕೆಗಳು, ಪ್ರತಿಕ್ರಿಯೆ ಸರಾಸರಿಗಳು ಮತ್ತು ಅಪಾಯಕಾರಿ ವಲಯಗಳನ್ನು ಮೇಲ್ವಿಚಾರಣೆ ಮಾಡಿ.",
    catalystEn: "Dynamically aggregates police metrics deployed on Zia Slate & App Sail Compute.",
    catalystKn: "ಜಿಯಾ ಸ್ಲೇಟ್ ಮತ್ತು ಆಪ್ ಸೈಲ್ ಕಂಪ್ಯೂಟ್‌ನಲ್ಲಿ ನಿಯೋಜಿಸಲಾದ ಪೊಲೀಸ್ ಮೆಟ್ರಿಕ್‌ಗಳನ್ನು ಕ್ರಿಯಾತ್ಮಕವಾಗಿ ಒಟ್ಟುಗೂಡಿಸುತ್ತದೆ.",
    serviceName: "Zia Slate & App Sail Compute",
    placement: "bottom",
  },
  {
    selector: "#tour-dashboard-clearance",
    path: "/dashboard",
    titleEn: "Predictive Analytics",
    titleKn: "ಮುನ್ಸೂಚಕ ವಿಶ್ಲೇಷಣೆ",
    textEn: "The platform clearance rate forecasts case resolution by evaluating past crime statistics and response rates.",
    textKn: "ಐತಿಹಾಸಿಕ ಅಪರಾಧ ಅಂಕಿಅಂಶಗಳು ಮತ್ತು ಪ್ರತಿಕ್ರಿಯೆ ದರಗಳನ್ನು ಮೌಲ್ಯಮಾಪನ ಮಾಡುವ ಮೂಲಕ ಪ್ರಕರಣದ ಪರಿಹಾರವನ್ನು ಕ್ಲಿಯರೆನ್ಸ್ ದರವು ಮುನ್ಸೂಚಿಸುತ್ತದೆ.",
    catalystEn: "Powered by Catalyst Quick ML regression models.",
    catalystKn: "ಜೋಹೋ ಕ್ಯಾಟಲಿಸ್ಟ್ ಕ್ವಿಕ್ ಎಂಎಲ್ ರಿಗ್ರೆಷನ್ ಮಾದರಿಗಳಿಂದ ಚಾಲಿತವಾಗಿದೆ.",
    serviceName: "Catalyst Quick ML",
    placement: "left",
  },
  {
    selector: "#tour-dashboard-ticker",
    path: "/dashboard",
    titleEn: "Live Alerts Feed",
    titleKn: "ಲೈವ್ ಎಚ್ಚರಿಕೆಗಳ ಫೀಡ್",
    textEn: "Streams real-time ongoing emergency logs directly from active police stations.",
    textKn: "ಸಕ್ರಿಯ ಪೊಲೀಸ್ ಠಾಣೆಗಳಿಂದ ನೇರವಾಗಿ ನೈಜ-ಸಮಯದ ತುರ್ತು ಲಾಗ್‌ಗಳನ್ನು ಸ್ಟ್ರೀಮ್ ಮಾಡುತ್ತದೆ.",
    catalystEn: "Uses App Sail Compute & serverless Functions to broadcast live station updates.",
    catalystKn: "ಲೈವ್ ನವೀಕರಣಗಳನ್ನು ಪ್ರಸಾರ ಮಾಡಲು ಆಪ್ ಸೈಲ್ ಕಂಪ್ಯೂಟ್ ಮತ್ತು ಸರ್ವರ್‌ಲೆಸ್ ಕಾರ್ಯಗಳನ್ನು ಬಳಸುತ್ತದೆ.",
    serviceName: "App Sail Compute Workers",
    placement: "bottom",
  },
  {
    selector: "#tour-sidebar-bot",
    path: "/dashboard",
    titleEn: "Prahari AI Bot Navigation",
    titleKn: "ಪ್ರಹರಿ AI ಬೋಟ್ ನ್ಯಾವಿಗೇಶನ್",
    textEn: "Let's explore the Prahari AI Assistant. Clicking 'Next' will automatically navigate to the chatbot console.",
    textKn: "ಪ್ರಹರಿ AI ಸಹಾಯಕನನ್ನು ಅನ್ವೇಷಿಸೋಣ. 'ಮುಂದೆ' ಕ್ಲಿಕ್ ಮಾಡಿದರೆ ಸ್ವಯಂಚಾಲಿತವಾಗಿ ಚಾಟ್‌ಬಾಟ್ ಕನ್ಸೋಲ್‌ಗೆ ನ್ಯಾವಿಗೇಟ್ ಆಗುತ್ತದೆ.",
    catalystEn: "Integrated sidebar links powered by App Sail Compute router handlers.",
    catalystKn: "ಆಪ್ ಸೈಲ್ ಕಂಪ್ಯೂಟ್ ರೂಟರ್ ಹ್ಯಾಂಡ್ಲರ್‌ಗಳಿಂದ ಚಾಲಿತವಾದ ಸಂಯೋಜಿತ ಸೈಡ್‌ಬಾರ್ ಲಿಂಕ್‌ಗಳು.",
    serviceName: "App Sail Router",
    placement: "right",
  },
  {
    selector: "#tour-chat-textarea",
    path: "/bot",
    titleEn: "Natural Language Prompt",
    titleKn: "ನೈಸರ್ಗಿಕ ಭಾಷೆಯ ಪ್ರಾಂಪ್ಟ್",
    textEn: "Type instructions to query spatial databases, extract data from suspect files, or generate investigation reports.",
    textKn: "ಡೇಟಾಬೇಸ್‌ಗಳನ್ನು ಪ್ರಶ್ನಿಸಲು, ಶಂಕಿತ ಫೈಲ್‌ಗಳಿಂದ ಡೇಟಾವನ್ನು ಹೊರತೆಗೆಯಲು ಅಥವಾ ತನಿಖಾ ವರದಿಗಳನ್ನು ರಚಿಸಲು ಸೂಚನೆಗಳನ್ನು ಟೈಪ್ ಮಾಡಿ.",
    catalystEn: "Processed by Zia-trained NLP models and background App Sail handlers.",
    catalystKn: "ಜಿಯಾ-ತರಬೇತಿ ಪಡೆದ ಎನ್‌ಎಲ್‌ಪಿ ಮಾದರಿಗಳು ಮತ್ತು ಬ್ಯಾಕ್‌ಗ್ರೌಂಡ್ ಆಪ್ ಸೈಲ್ ಹ್ಯಾಂಡ್ಲರ್‌ಗಳಿಂದ ಪ್ರಕ್ರಿಯೆಗೊಳಿಸಲಾಗಿದೆ.",
    serviceName: "Catalyst Quick ML & Zia Trained NLP",
    placement: "top",
  },
  {
    selector: "#tour-chat-mic",
    path: "/bot",
    titleEn: "Zia Voice Commands",
    titleKn: "ಜಿಯಾ ಧ್ವನಿ ಆಜ್ಞೆಗಳು",
    textEn: "Dictate searches or record vocal crime logs hands-free. Crucial for field officers on active mobile duties.",
    textKn: "ಹುಡುಕಾಟಗಳನ್ನು ನಿರ್ದೇಶಿಸಿ ಅಥವಾ ಧ್ವನಿ ಅಪರಾಧ ಲಾಗ್‌ಗಳನ್ನು ಹ್ಯಾಂಡ್ಸ್-ಫ್ರೀ ರೆಕಾರ್ಡ್ ಮಾಡಿ. ಸಕ್ರಿಯ ಕರ್ತವ್ಯದಲ್ಲಿರುವ ಕ್ಷೇತ್ರ ಅಧಿಕಾರಿಗಳಿಗೆ ಇದು ಅತ್ಯಗತ್ಯ.",
    catalystEn: "Integrates Catalyst speech-to-text (STT) and text-to-speech (TTS) services.",
    catalystKn: "ಕ್ಯಾಟಲಿಸ್ಟ್ ಸ್ಪೀಚ್-ಟು-ಟೆಕ್ಸ್ಟ್ (STT) ಮತ್ತು ಟೆಕ್ಸ್ಟ್-ಟು-ಸ್ಪೀಚ್ (TTS) ಸೇವೆಗಳನ್ನು ಸಂಯೋಜಿಸುತ್ತದೆ.",
    serviceName: "Catalyst Quick ML & Zia TTS/STT",
    placement: "top",
  },
  {
    selector: "#tour-chat-ocr",
    path: "/bot",
    titleEn: "Zia OCR Engine",
    titleKn: "ಜಿಯಾ ಒಸಿಆರ್ ಇಂಜಿನ್",
    textEn: "Extract text from suspect documents and visual evidence files effortlessly.",
    textKn: "ಶಂಕಿತ ದಾಖಲೆಗಳು ಮತ್ತು ದೃಶ್ಯ ಸಾಕ್ಷ್ಯ ಫೈಲ್‌ಗಳಿಂದ ಪಠ್ಯವನ್ನು ಸಲೀಸಾಗಿ ಹೊರತೆಗೆಯಿರಿ.",
    catalystEn: "Powered by Zia OCR Engine for scanning and extracting text from images.",
    catalystKn: "ಚಿತ್ರಗಳಿಂದ ಪಠ್ಯವನ್ನು ಸ್ಕ್ಯಾನ್ ಮಾಡಲು ಮತ್ತು ಹೊರತೆಗೆಯಲು ಜಿಯಾ ಒಸಿಆರ್ ಎಂಜಿನ್‌ನಿಂದ ಚಾಲಿತವಾಗಿದೆ.",
    serviceName: "Zia OCR Engine",
    placement: "top",
  },
  {
    selector: "#tour-sidebar-map",
    path: "/bot",
    titleEn: "Incident Map Navigation",
    titleKn: "ಘಟನೆ ನಕ್ಷೆ ನ್ಯಾವಿಗೇಶನ್",
    textEn: "Let's check out the crime map next. Clicking 'Next' will automatically route to the hotspots layout.",
    textKn: "ಮುಂದೆ ಅಪರಾಧ ನಕ್ಷೆಯನ್ನು ಪರಿಶೀಲಿಸೋಣ. 'ಮುಂದೆ' ಕ್ಲಿಕ್ ಮಾಡಿದರೆ ಸ್ವಯಂಚಾಲಿತವಾಗಿ ಹಾಟ್‌ಸ್ಪಾಟ್‌ಗಳ ವಿನ್ಯಾಸಕ್ಕೆ ನ್ಯಾವಿಗೇಟ್ ಮಾಡುತ್ತದೆ.",
    catalystEn: "Direct client routing hosted via Zia Slate routing context.",
    catalystKn: "ಜಿಯಾ ಸ್ಲೇಟ್ ರೂಟಿಂಗ್ ಸಂದರ್ಭದ ಮೂಲಕ ಹೋಸ್ಟ್ ಮಾಡಲಾದ ನೇರ ನ್ಯಾವಿಗೇಶನ್.",
    serviceName: "Zia Slate Route",
    placement: "right",
  },
  {
    selector: "#tour-map-leaflet",
    path: "/map",
    titleEn: "Karnataka FIR Hotspots Map",
    titleKn: "ಕರ್ನಾಟಕ FIR ಹಾಟ್‌ಸ್ಪಾಟ್‌ಗಳ ನಕ್ಷೆ",
    textEn: "Interactive geographical visualization of FIR density. Circles represent police stations scaled by active incident volume.",
    textKn: "FIR ಸಾಂದ್ರತೆಯ ಸಂವಾದಾತ್ಮಕ ಭೌಗೋಳಿಕ ದೃಶ್ಯೀಕರಣ. ವೃತ್ತಗಳು ಸಕ್ರಿಯ ಘಟನೆಯ ಪ್ರಮಾಣದಿಂದ ಅಳೆಯಲಾದ ಪೊಲೀಸ್ ಠಾಣೆಗಳನ್ನು ಪ್ರತಿನಿಧಿಸುತ್ತವೆ.",
    catalystEn: "Pulls real-time coordinate coordinates hosted on App Sail Compute data tables.",
    catalystKn: "ಆಪ್ ಸೈಲ್ ಕಂಪ್ಯೂಟ್ ಡೇಟಾ ಕೋಷ್ಟಕಗಳಲ್ಲಿ ಹೋಸ್ಟ್ ಮಾಡಲಾದ ನೈಜ-ಸಮಯದ ಪ್ರಾದೇಶಿಕ ಸಂಘಟನಾ ಡೇಟಾವನ್ನು ಎಳೆಯುತ್ತದೆ.",
    serviceName: "App Sail Compute & Zia Slate",
    placement: "right",
  },
  {
    selector: "#tour-map-theme",
    path: "/map",
    titleEn: "Map Visualizer Controls",
    titleKn: "ನಕ್ಷೆ ದೃಶ್ಯೀಕರಣ ನಿಯಂತ್ರಣಗಳು",
    textEn: "Toggle Map Theme between Dark Mode (for low-light control rooms) and Light Mode. Filter specific crime classes (Theft, Burglary, Violent) on the fly.",
    textKn: "ಡಾರ್ಕ್ ಮೋಡ್ ಮತ್ತು ಲೈಟ್ ಮೋಡ್ ನಡುವೆ ನಕ್ಷೆ ಥೀಮ್ ಅನ್ನು ಟಾಗಲ್ ಮಾಡಿ. ಹಾರಾಟದ ಸಮಯದಲ್ಲಿ ನಿರ್ದಿಷ್ಟ ಅಪರಾಧ ವರ್ಗಗಳನ್ನು ಫಿಲ್ಟರ್ ಮಾಡಿ.",
    catalystEn: "Applies filters client-side on the App Sail-served dashboard context.",
    catalystKn: "ಆಪ್ ಸೈಲ್ ಮೂಲಕ ಒದಗಿಸಲಾದ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್ ಸಂದರ್ಭದಲ್ಲಿ ಕ್ಲೈಂಟ್ ಸೈಡ್ ಫಿಲ್ಟರ್‌ಗಳನ್ನು ಅನ್ವಯಿಸುತ್ತದೆ.",
    serviceName: "App Sail Compute Clients",
    placement: "bottom",
  },
  {
    selector: "#tour-logo-header",
    path: "/dashboard",
    titleEn: "Tour Completed!",
    titleKn: "ಪ್ರವಾಸ ಪೂರ್ಣಗೊಂಡಿದೆ!",
    textEn: "You are fully oriented with Prahari AI. Restart the tour anytime using the help icon in the header.",
    textKn: "ನೀವು ಪ್ರಹರಿ AI ಗೆ ಸಂಪೂರ್ಣವಾಗಿ ಪರಿಚಿತರಾಗಿದ್ದೀರಿ. ಹೆಡರ್‌ನಲ್ಲಿರುವ ಸಹಾಯ ಐಕಾನ್ ಬಳಸಿ ಯಾವುದೇ ಸಮಯದಲ್ಲಿ ಪ್ರವಾಸವನ್ನು ಮರುಪ್ರಾರಂಭಿಸಿ.",
    catalystEn: "Karnataka Police platform — Powered by Zia & Catalyst Services.",
    catalystKn: "ಕರ್ನಾಟಕ ಪೊಲೀಸ್ ವೇದಿಕೆ — ಜಿಯಾ ಮತ್ತು ಕ್ಯಾಟಲಿಸ್ಟ್ ಸೇವೆಗಳಿಂದ ಚಾಲಿತವಾಗಿದೆ.",
    serviceName: "Zia Slate & App Sail Compute",
    placement: "bottom",
  }
];

export const TourProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();

  // Check if tour was completed before
  useEffect(() => {
    const isCompleted = localStorage.getItem("prahari_tour_completed");
    if (!isCompleted) {
      // Start tour automatically on first visit after a delay
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  // Monitor route changes to auto-advance
  useEffect(() => {
    // Landing on dashboard from login step (step index 3)
    if (stepIndex === 3 && location.pathname === "/dashboard") {
      setStepIndex(4);
    }
    // Fast-forward to dashboard steps if already logged in and tour was started from Login page steps
    if (isOpen && stepIndex < 4 && location.pathname !== "/login") {
      setStepIndex(4);
    }
  }, [location.pathname, stepIndex, isOpen]);

  const startTour = () => {
    setIsOpen(true);
    setStepIndex(0);
    // If not on login page, reset to dashboard or first step of current page
    if (location.pathname === "/login") {
      setStepIndex(0);
    } else {
      // If already logged in, skip the login steps (0-3) and start on dashboard (step 4)
      setStepIndex(4);
      if (location.pathname !== "/dashboard") {
        navigate("/dashboard");
      }
    }
  };

  const nextStep = async () => {
    const currentStep = steps[stepIndex];
    
    // Execute custom onNext hook (e.g., auto-filling and submitting login, toggling panels)
    if (currentStep.onNext) {
      await currentStep.onNext();
    }

    if (stepIndex === 7) {
      // Route to bot
      navigate("/bot");
      setStepIndex(8);
      return;
    }

    if (stepIndex === 11) {
      // Route to map
      navigate("/map");
      setStepIndex(12);
      return;
    }

    if (stepIndex < steps.length - 1) {
      setStepIndex((prev) => prev + 1);
    } else {
      // Tour completed
      setIsOpen(false);
      localStorage.setItem("prahari_tour_completed", "true");
      navigate("/dashboard");
    }
  };

  const prevStep = () => {
    if (stepIndex > 0) {
      const prevIdx = stepIndex - 1;
      const prevStepObj = steps[prevIdx];
      
      // Auto-navigate backward if needed
      if (prevStepObj.path && location.pathname !== prevStepObj.path) {
        navigate(prevStepObj.path);
      }
      
      setStepIndex(prevIdx);
    }
  };

  const skipTour = () => {
    setIsOpen(false);
    localStorage.setItem("prahari_tour_completed", "true");
  };

  return (
    <TourContext.Provider
      value={{
        isOpen,
        stepIndex,
        steps,
        startTour,
        nextStep,
        prevStep,
        skipTour,
        setIsOpen,
        setStepIndex,
      }}
    >
      {children}
    </TourContext.Provider>
  );
};

export const useTour = () => {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error("useTour must be used within a TourProvider");
  }
  return context;
};

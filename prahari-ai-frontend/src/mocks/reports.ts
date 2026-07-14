import type { Report } from "./types";

export const REPORTS: Report[] = [
  {
    id: "RPT-001", title: "Koramangala Robbery Incident Summary", caseId: "INC-007",
    type: "Incident Summary", status: "Finalized", createdAt: "2026-07-14T08:30:00Z",
    updatedAt: "2026-07-14T11:15:00Z", lastEditedBy: "Inspector Raj",
    sections: [
      { heading: "Incident Overview", content: "On 14 July 2026 at 22:18 hrs, an armed robbery was reported at the Hindustan Petroleum petrol bunk on Banashankari 3rd Stage. Two suspects armed with country-made weapons entered the premises and demanded cash from the attendant." },
      { heading: "Evidence Collected", content: "CCTV footage recovered from 3 cameras on premises. Fingerprints lifted from cash counter. Eyewitness statements recorded from 2 attendants and 1 customer." },
      { heading: "Investigation Status", content: "Two units dispatched immediately. Perimeter search conducted within 2 km radius. Case under active investigation. Suspects not yet apprehended as of time of filing." },
      { heading: "Recommendations", content: "Recommend increased patrol frequency in Banashankari zone between 21:00 and 01:00 hrs. Coordinate with nearby establishments for CCTV data." },
    ],
    versionHistory: [
      { version: 1, editedAt: "2026-07-14T08:30:00Z", editedBy: "SI Kumar B", note: "Initial draft" },
      { version: 2, editedAt: "2026-07-14T10:00:00Z", editedBy: "Inspector Raj", note: "Added evidence section" },
      { version: 3, editedAt: "2026-07-14T11:15:00Z", editedBy: "Inspector Raj", note: "Finalized for submission" },
    ],
  },
  {
    id: "RPT-002", title: "Drug Nexus Operation — Hebbal Zone", caseId: "INC-005",
    type: "Chargesheet Draft", status: "Under Review", createdAt: "2026-07-14T10:00:00Z",
    updatedAt: "2026-07-14T14:30:00Z", lastEditedBy: "SI Deepa R",
    sections: [
      { heading: "Accused Details", content: "Name: Redacted (pending court order). Age: 28 years. Prior convictions: 1 (2023, possession). Occupation: Auto driver." },
      { heading: "Charges", content: "Section 20 of the Narcotic Drugs and Psychotropic Substances Act, 1985 — possession of cannabis (200g). Section 21 — trafficking." },
      { heading: "Evidence Summary", content: "200g cannabis recovered from accused's vehicle. Digital scale and packaging material seized. Call records linking accused to known supplier — forensic analysis pending." },
    ],
    versionHistory: [
      { version: 1, editedAt: "2026-07-14T10:00:00Z", editedBy: "HC Suresh P", note: "Initial field report" },
      { version: 2, editedAt: "2026-07-14T14:30:00Z", editedBy: "SI Deepa R", note: "Legal review draft" },
    ],
  },
  {
    id: "RPT-003", title: "FIR — Chain Snatching, BTM Layout", caseId: "INC-002",
    type: "FIR Draft", status: "Draft", createdAt: "2026-07-14T12:00:00Z",
    updatedAt: "2026-07-14T12:45:00Z", lastEditedBy: "SI Priya M",
    sections: [
      { heading: "Complainant Statement", content: "Victim states she was walking on BTM 2nd Stage Main Road at approximately 20:30 hrs when an unidentified male on a motorcycle snatched her gold chain (approx 12g, valued at ₹72,000) and fled." },
      { heading: "Suspect Description", content: "Male, approximately 22-28 years, dark complexion, wearing black T-shirt. Riding Honda Activa (colour: black). Partial plate: KA-04." },
    ],
    versionHistory: [
      { version: 1, editedAt: "2026-07-14T12:00:00Z", editedBy: "SI Priya M", note: "AI-drafted from victim statement" },
      { version: 2, editedAt: "2026-07-14T12:45:00Z", editedBy: "SI Priya M", note: "Officer reviewed and edited" },
    ],
  },
  {
    id: "RPT-004", title: "Cybercrime Analytics Export — Q2 2026", caseId: "N/A",
    type: "Analytics Export", status: "Submitted", createdAt: "2026-07-01T09:00:00Z",
    updatedAt: "2026-07-01T09:00:00Z", lastEditedBy: "Inspector Raj",
    sections: [
      { heading: "Summary", content: "Q2 2026 cybercrime report covering 32 cases across Bangalore Urban district. UPI fraud accounts for 68% of cases. Total financial loss reported: ₹18.4 Lakhs." },
    ],
    versionHistory: [{ version: 1, editedAt: "2026-07-01T09:00:00Z", editedBy: "Prahari AI", note: "Auto-generated analytics export" }],
  },
  {
    id: "RPT-005", title: "Indiranagar Burglary Series — Pattern Analysis", caseId: "INC-003",
    type: "Incident Summary", status: "Under Review", createdAt: "2026-07-13T16:00:00Z",
    updatedAt: "2026-07-14T09:00:00Z", lastEditedBy: "Inspector Raj",
    sections: [
      { heading: "Pattern Analysis", content: "4 burglaries in Indiranagar 100 Feet Rd corridor over 10 days. All occurred between 14:00–18:00 hrs (when occupants typically away). Entry method consistent: rear window/grille forced. Likely same perpetrator(s)." },
    ],
    versionHistory: [
      { version: 1, editedAt: "2026-07-13T16:00:00Z", editedBy: "Prahari AI", note: "AI pattern detection report" },
      { version: 2, editedAt: "2026-07-14T09:00:00Z", editedBy: "Inspector Raj", note: "Officer annotations added" },
    ],
  },
  {
    id: "RPT-006", title: "July 14 Shift Commander Daily Brief", caseId: "N/A",
    type: "Incident Summary", status: "Finalized", createdAt: "2026-07-14T06:00:00Z",
    updatedAt: "2026-07-14T06:00:00Z", lastEditedBy: "Prahari AI",
    sections: [
      { heading: "Shift Overview", content: "14 active incidents as of 06:00 hrs. 11 patrol units on duty. Alert level: YELLOW. Priority zones: Koramangala, Banashankari, Banaswadi." },
    ],
    versionHistory: [{ version: 1, editedAt: "2026-07-14T06:00:00Z", editedBy: "Prahari AI", note: "Auto-generated shift brief" }],
  },
  {
    id: "RPT-007", title: "Yelahanka Jewellery Heist — FIR", caseId: "INC-012",
    type: "FIR Draft", status: "Draft", createdAt: "2026-07-14T15:00:00Z",
    updatedAt: "2026-07-14T15:00:00Z", lastEditedBy: "SI Kumar B",
    sections: [
      { heading: "Incident Report", content: "Commercial break-in at Sri Lakshmi Jewellers, Yelahanka New Town. Alarm triggered at 05:15 hrs. On-site inspection reveals safe tampered with hydraulic equipment. Estimated loss: ₹8–12 Lakhs (inventory assessment ongoing)." },
    ],
    versionHistory: [{ version: 1, editedAt: "2026-07-14T15:00:00Z", editedBy: "SI Kumar B", note: "Initial FIR draft" }],
  },
  {
    id: "RPT-008", title: "Weekly Crime Statistics — Week 28, 2026", caseId: "N/A",
    type: "Analytics Export", status: "Submitted", createdAt: "2026-07-07T09:00:00Z",
    updatedAt: "2026-07-07T09:00:00Z", lastEditedBy: "Prahari AI",
    sections: [
      { heading: "Weekly Summary", content: "Week 28: 72 incidents logged. Theft (28%), Assault (19%), Burglary (17%). Clearance rate: 72.4% (+3.2% vs prior week). Response time avg: 8.6 mins." },
    ],
    versionHistory: [{ version: 1, editedAt: "2026-07-07T09:00:00Z", editedBy: "Prahari AI", note: "Auto-generated weekly statistics" }],
  },
];

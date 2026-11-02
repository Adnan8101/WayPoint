// Editorial content (guides, FAQs, announcements). Kept general on purpose:
// rules change, so we point travellers to the carrier for specifics.

export const FAQS = [
  {
    q: "How do I check my PNR status?",
    a: "Open PNR Status, enter the 10-digit PNR printed at the top left of your ticket or in your booking SMS/email, and press Check Status. You will see booking status and current status for each passenger, plus whether the reservation chart has been prepared.",
  },
  {
    q: "What is the difference between booking status and current status?",
    a: "Booking status is the status you received when the ticket was booked (for example GNWL/25). Current status is the status right now. For example, CNF means confirmed, RAC means you will get a shared berth, and WL means you are still on the waiting list.",
  },
  {
    q: "Which date should I choose for train running status?",
    a: "Choose the date the train started its journey from its source station, not the date it reaches your station. For long-distance trains these can differ by a day or more.",
  },
  {
    q: "Is the flight and train information live?",
    a: "Where our data providers report live information we label it Actual or Live. Timetable times are labelled Sched and predictions are labelled Est. If live information cannot be retrieved we say so. We never guess or fill in data.",
  },
  {
    q: "Do I need an account?",
    a: "No. Every search on Travel Hub works without logging in. Your recent searches are stored only in your own browser and can be cleared at any time.",
  },
  {
    q: "Can I book tickets here?",
    a: "No. Travel Hub is an information service. Book train tickets through IRCTC or authorised agents, and flights directly with airlines or travel agencies.",
  },
  {
    q: "Why does my flight show a different time from my ticket?",
    a: "Times are shown in the local time of each airport. Airlines also revise schedules, so if the scheduled time differs from your ticket, check with your airline.",
  },
];

export const GUIDES = {
  airport: [
    { title: "Before you leave for the airport", body: "Check your flight status and terminal shortly before leaving. Gates and terminals can change on the day. Many airlines recommend arriving about 2 hours early for domestic flights and 3 hours for international flights. Your airline's own guidance takes priority." },
    { title: "Documents and ID", body: "Carry a valid government-issued photo ID that matches your booking, plus a passport and any required visas for international travel. Keep e-tickets or boarding passes available offline." },
    { title: "Baggage", body: "Cabin and checked baggage allowances differ by airline and fare type. Power banks and spare lithium batteries usually must go in cabin baggage, not checked baggage." },
    { title: "Arrivals", body: "Use the airport's Arrivals board to check landing times and baggage belts. Allow time for immigration and customs on international arrivals." },
  ],
  station: [
    { title: "Reaching the station", body: "Check the train's running status before leaving and reach the station well before the scheduled departure. At large stations, finding the right platform and coach takes time." },
    { title: "Platforms and coach position", body: "Platform numbers are announced and shown on station displays, and they can change. Check them again when you arrive at the station." },
    { title: "Tickets and ID", body: "Carry your e-ticket or SMS and the original ID proof of a passenger on the ticket. Ticket checkers may ask to see it." },
    { title: "Waiting-list tickets", body: "Check your PNR status after the chart is prepared. Rules on travelling with an unconfirmed ticket vary by booking type, so check the current Indian Railways rules." },
  ],
  tips: [
    "Save your PNR, flight number and booking reference somewhere you can reach offline.",
    "Check status again just before you leave. Delays and gate or platform changes happen at short notice.",
    "Keep chargers, medicines and valuables in your hand luggage.",
    "Confirm the exact station or airport, because many cities have more than one (for example NDLS, NZM and ANVT in Delhi).",
    "Look up the destination's weather and local time before you travel so you can plan connections and clothing.",
  ],
  passenger: [
    { title: "Passengers needing assistance", body: "Airlines and Indian Railways offer assistance for passengers with reduced mobility. Request it when booking or well before travel through your carrier." },
    { title: "Travelling with children", body: "Fare and ID rules for children differ between airlines and railways. Check the carrier's rules for infants and children before booking." },
    { title: "Refunds and cancellations", body: "Cancellation charges and refund timelines depend on the ticket type and when you cancel. Use your carrier's official channels to cancel." },
  ],
};

export const ANNOUNCEMENTS = [
  { title: "Live status depends on provider updates", body: "Trains and flights report positions at intervals, so a status may lag by several minutes. Every result shows when it was last updated." },
  { title: "Choose the right start date for trains", body: "For running status, choose the date the train left its source station." },
  { title: "Your searches stay on your device", body: "Recent searches are saved in your browser only. Nothing is linked to an account." },
];

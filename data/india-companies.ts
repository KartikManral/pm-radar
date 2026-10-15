// Indian startups and companies with large product teams in India.
// We don't know which job-board system each one uses, so once a week the
// crawler tries every system (Greenhouse, Lever, Ashby, Workable,
// SmartRecruiters) with a few spellings of the name and remembers what works.
// Add a company by adding its name; add `slugs` if its careers URL uses an
// unusual name (e.g. jobs.lever.co/<slug>).

export type Candidate = { name: string; slugs?: string[] };

export const INDIA_COMPANIES: Candidate[] = [
  // Fintech
  { name: "Razorpay" }, { name: "CRED", slugs: ["cred", "dreamplug"] }, { name: "Groww" }, { name: "Zerodha" },
  { name: "PhonePe" }, { name: "Paytm" }, { name: "BharatPe" }, { name: "Pine Labs" }, { name: "Juspay" },
  { name: "Cashfree", slugs: ["cashfree", "cashfreepayments"] }, { name: "PayU" }, { name: "Setu" }, { name: "M2P Fintech", slugs: ["m2p", "m2pfintech"] },
  { name: "Zeta" }, { name: "Open", slugs: ["open", "openmoney", "bankopen"] }, { name: "Jupiter", slugs: ["jupiter", "jupitermoney"] },
  { name: "Fi Money", slugs: ["fi", "epifi", "fimoney"] }, { name: "Slice", slugs: ["slice", "sliceit"] }, { name: "Uni Cards", slugs: ["uni", "unicards"] },
  { name: "OneCard", slugs: ["onecard", "fpl", "fpltechnologies"] }, { name: "Navi" }, { name: "Upstox" }, { name: "INDmoney" },
  { name: "smallcase" }, { name: "Scripbox" }, { name: "Jar", slugs: ["jar", "jarapp", "changejar"] }, { name: "CoinDCX" },
  { name: "CoinSwitch" }, { name: "MobiKwik" }, { name: "Lendingkart" }, { name: "KreditBee" }, { name: "Money View", slugs: ["moneyview"] },
  { name: "Fibe", slugs: ["fibe", "earlysalary"] }, { name: "Rupeek" }, { name: "Acko" }, { name: "Digit Insurance", slugs: ["godigit", "digit"] },
  { name: "PolicyBazaar" }, { name: "Ditto", slugs: ["ditto", "joinditto"] }, { name: "Perfios" }, { name: "Signzy" }, { name: "IDfy" },
  { name: "Decentro" }, { name: "Freecharge" }, { name: "Dhan" }, { name: "Fyers" }, { name: "Sensibull" },
  { name: "Stable Money", slugs: ["stablemoney"] }, { name: "Kuvera" }, { name: "Easebuzz" }, { name: "Plum", slugs: ["plum", "plumhq"] },
  { name: "Neo", slugs: ["neowealth"] }, { name: "Kotak Neo", slugs: ["kotakneo"] }, { name: "Paisabazaar" }, { name: "Tata Neu", slugs: ["tataneu"] },

  // Commerce, consumer, mobility
  { name: "Swiggy", slugs: ["swiggy", "bundltechnologies"] }, { name: "Zomato", slugs: ["zomato", "eternal"] }, { name: "Zepto" },
  { name: "Blinkit" }, { name: "Meesho" }, { name: "Flipkart" }, { name: "Myntra" }, { name: "Nykaa" }, { name: "Lenskart" },
  { name: "boAt", slugs: ["boat", "boatlifestyle"] }, { name: "Honasa", slugs: ["honasa", "mamaearth"] }, { name: "Sugar Cosmetics", slugs: ["sugarcosmetics"] },
  { name: "Licious" }, { name: "FreshToHome" }, { name: "Country Delight", slugs: ["countrydelight"] }, { name: "Udaan" },
  { name: "Jumbotail" }, { name: "Dunzo" }, { name: "BigBasket" }, { name: "Purplle" }, { name: "FirstCry" }, { name: "Pepperfry" },
  { name: "Urban Company", slugs: ["urbancompany", "urbanclap"] }, { name: "NoBroker" }, { name: "Housing" }, { name: "Livspace" },
  { name: "HomeLane" }, { name: "Cars24" }, { name: "Spinny" }, { name: "CarDekho", slugs: ["cardekho", "girnarsoft"] }, { name: "Rapido" },
  { name: "Ola", slugs: ["ola", "olacabs", "olaelectric"] }, { name: "Yulu" }, { name: "Bounce" }, { name: "Ather Energy", slugs: ["atherenergy", "ather"] },
  { name: "OYO", slugs: ["oyo", "oyorooms"] }, { name: "MakeMyTrip" }, { name: "ixigo" }, { name: "Cleartrip" }, { name: "Zoomcar" },
  { name: "Pocket FM", slugs: ["pocketfm"] }, { name: "Kuku FM", slugs: ["kukufm"] }, { name: "ShareChat", slugs: ["sharechat", "mohalla", "mohallatech"] },
  { name: "Dailyhunt", slugs: ["dailyhunt", "verse", "versetech"] }, { name: "Inshorts" }, { name: "Glance" }, { name: "InMobi" },
  { name: "STAGE", slugs: ["stage", "stageott"] }, { name: "Eloelo" }, { name: "Dream Sports", slugs: ["dreamsports", "dream11"] },
  { name: "MPL", slugs: ["mpl", "mobilepremierleague"] }, { name: "Games24x7" }, { name: "WinZO" }, { name: "Zupee" },
  { name: "Junglee Games", slugs: ["jungleegames"] }, { name: "Rooter" }, { name: "Pratilipi" }, { name: "Seekho" },
  { name: "Snitch" }, { name: "The Souled Store", slugs: ["thesouledstore"] }, { name: "Bewakoof" }, { name: "Rare Rabbit", slugs: ["rarerabbit"] },
  { name: "District", slugs: ["district"] }, { name: "BookMyShow", slugs: ["bookmyshow", "bigtree"] }, { name: "Magicpin" },

  // Edtech
  { name: "Unacademy" }, { name: "upGrad" }, { name: "Physics Wallah", slugs: ["physicswallah", "pw"] }, { name: "BYJUS", slugs: ["byjus"] },
  { name: "Vedantu" }, { name: "Scaler", slugs: ["scaler", "interviewbit", "scalerschool"] }, { name: "Simplilearn" }, { name: "Eruditus" },
  { name: "Great Learning", slugs: ["greatlearning"] }, { name: "Classplus" }, { name: "Teachmint" }, { name: "Leap Scholar", slugs: ["leapscholar", "leap"] },
  { name: "Leverage Edu", slugs: ["leverageedu"] }, { name: "Cuemath" }, { name: "Testbook" }, { name: "Adda247" },
  { name: "Masai School", slugs: ["masaischool", "masai"] }, { name: "Newton School", slugs: ["newtonschool"] }, { name: "Internshala" },
  { name: "Coding Ninjas", slugs: ["codingninjas"] }, { name: "Unstop" }, { name: "Seekho" }, { name: "Toppr" },

  // B2B SaaS, AI and dev tools built in India
  { name: "Freshworks" }, { name: "Zoho" }, { name: "Chargebee" }, { name: "Postman", slugs: ["postman", "postmanlabs"] },
  { name: "BrowserStack" }, { name: "Hasura" }, { name: "Appsmith" }, { name: "ToolJet" }, { name: "Chatwoot" }, { name: "Dyte" },
  { name: "Plivo" }, { name: "Exotel" }, { name: "Gupshup" }, { name: "MoEngage" }, { name: "CleverTap" }, { name: "WebEngage" },
  { name: "Netcore", slugs: ["netcore", "netcorecloud"] }, { name: "LeadSquared" }, { name: "Capillary", slugs: ["capillary", "capillarytech"] },
  { name: "Darwinbox" }, { name: "Leena AI", slugs: ["leenaai", "leena"] }, { name: "Whatfix" }, { name: "Mindtickle" },
  { name: "Hevo Data", slugs: ["hevodata", "hevo"] }, { name: "Atlan" }, { name: "Rocketlane" }, { name: "Sprinto" }, { name: "Zluri" },
  { name: "SpotDraft" }, { name: "Yellow.ai", slugs: ["yellowai", "yellow"] }, { name: "Haptik" }, { name: "Uniphore" },
  { name: "Observe.AI", slugs: ["observeai"] }, { name: "Sarvam AI", slugs: ["sarvam", "sarvamai"] }, { name: "Krutrim" },
  { name: "Druva" }, { name: "Icertis" }, { name: "Innovaccer" }, { name: "Practo" }, { name: "PharmEasy" }, { name: "Tata 1mg", slugs: ["1mg", "tata1mg"] },
  { name: "HealthifyMe" }, { name: "Cult.fit", slugs: ["cultfit", "curefit"] }, { name: "Pristyn Care", slugs: ["pristyncare"] },
  { name: "Eka Care", slugs: ["ekacare"] }, { name: "Qure.ai", slugs: ["qureai", "qure"] }, { name: "Tracxn" }, { name: "Wingify", slugs: ["wingify", "vwo"] },
  { name: "Kissflow" }, { name: "Zenoti" }, { name: "Vymo" }, { name: "Signeasy" }, { name: "Facilio" }, { name: "Lentra" },
  { name: "Increff" }, { name: "Netomi" }, { name: "Sprinklr" }, { name: "Amagi" }, { name: "HighRadius" }, { name: "Shiprocket" },
  { name: "Delhivery" }, { name: "BlackBuck" }, { name: "Porter", slugs: ["porter", "theporter"] }, { name: "Shadowfax" },
  { name: "Moglix" }, { name: "OfBusiness" }, { name: "Zetwerk" }, { name: "Infra.Market", slugs: ["inframarket"] }, { name: "Bizongo" },
  { name: "ElasticRun" }, { name: "DeHaat" }, { name: "Ninjacart" }, { name: "Composio" }, { name: "Atomicwork" },
  { name: "Simplismart" }, { name: "Pixis" }, { name: "Ultrahuman" }, { name: "Gan.ai", slugs: ["ganai"] }, { name: "Rephrase.ai", slugs: ["rephraseai"] },
  { name: "Fractal", slugs: ["fractal", "fractalanalytics"] }, { name: "Tekion" }, { name: "Harness", slugs: ["harness", "harnessinc"] },
  { name: "Cohesity" }, { name: "Nutanix" }, { name: "Zscaler" }, { name: "Confluent" }, { name: "Sumo Logic", slugs: ["sumologic"] },
  { name: "Couchbase" }, { name: "Gojek" }, { name: "Grab" }, { name: "Agoda" }, { name: "Rippling" }, { name: "Remote", slugs: ["remote", "remotecom"] },
  { name: "Intercom" }, { name: "Canva" }, { name: "Miro" }, { name: "Visa" }, { name: "Uber" }, { name: "Atlassian" },
  { name: "Swiggy Instamart", slugs: ["instamart"] }, { name: "Groww Mutual Fund", slugs: ["growwmf"] }, { name: "Jio", slugs: ["jio", "jioplatforms"] },
  { name: "Airtel", slugs: ["airtel", "airtelxlabs"] }, { name: "Tata Digital", slugs: ["tatadigital"] }, { name: "Reliance Retail", slugs: ["relianceretail"] },
];

/** Spellings to try for a company name on job-board URLs. */
export function slugVariants(c: Candidate): string[] {
  const base = c.name.toLowerCase().replace(/&/g, "and");
  const joined = base.replace(/[^a-z0-9]/g, "");
  const dashed = base.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return [...new Set([...(c.slugs ?? []), joined, dashed])].filter(Boolean);
}

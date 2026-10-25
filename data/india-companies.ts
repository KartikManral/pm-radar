// Indian startups and companies with large product teams in India.
// We don't know which job-board system each one uses, so once a week the
// crawler tries every system (Greenhouse, Lever, Ashby, Workable,
// SmartRecruiters) with a few spellings of the name and remembers what works.
// Add a company by adding its name; add `slugs` if its careers URL uses an
// unusual name (e.g. jobs.lever.co/<slug>).

export type Candidate = {
  name: string;
  slugs?: string[];
  /** Hiring tools to try; all of them when not set. */
  ats?: import("../lib/config").AtsName[];
};

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
  { name: "Coding Ninjas", slugs: ["codingninjas"] }, { name: "Unstop" }, { name: "Toppr" },

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

  // More startups and global companies with product teams in India
  { name: "Khatabook" }, { name: "OkCredit" }, { name: "Vyapar" }, { name: "Spenny" }, { name: "Kotak811", slugs: ["kotak811"] },
  { name: "Airtel Payments Bank", slugs: ["airtelpaymentsbank"] }, { name: "Paytm Money", slugs: ["paytmmoney"] }, { name: "Groww Pay", slugs: ["growwpay"] },
  { name: "Clear", slugs: ["clear", "cleartax", "cleartaxinc"] }, { name: "Recko" }, { name: "Instamojo" }, { name: "Niyo", slugs: ["niyo", "niyosolutions"] },
  { name: "Kissht" }, { name: "Indifi" }, { name: "Credgenics" }, { name: "Mintifi" }, { name: "Vested Finance", slugs: ["vested", "vestedfinance"] },
  { name: "Appreciate", slugs: ["appreciate", "appreciatewealth"] }, { name: "Wint Wealth", slugs: ["wintwealth"] }, { name: "Bureau", slugs: ["bureau", "bureauid"] },
  { name: "Hyperverge" }, { name: "Gokwik" }, { name: "Simpl", slugs: ["simpl", "getsimpl"] }, { name: "LazyPay" }, { name: "ZestMoney" },
  { name: "Swiggy Genie", slugs: ["swiggygenie"] }, { name: "Rebel Foods", slugs: ["rebelfoods"] }, { name: "EatSure" }, { name: "Box8" },
  { name: "Thrillophilia" }, { name: "Zostel" }, { name: "Treebo" }, { name: "FabHotels" }, { name: "EaseMyTrip" }, { name: "Yatra" },
  { name: "RedBus" }, { name: "Chalo" }, { name: "Park+", slugs: ["parkplus", "park-plus"] }, { name: "Drivetrain" }, { name: "Battery Smart", slugs: ["batterysmart"] },
  { name: "Euler Motors", slugs: ["eulermotors"] }, { name: "River", slugs: ["river", "rideriver"] }, { name: "Ultraviolette" },
  { name: "Apna", slugs: ["apna", "apnatime"] }, { name: "WorkIndia" }, { name: "Instahyre" }, { name: "Cutshort" }, { name: "Naukri", slugs: ["infoedge", "naukri"] },
  { name: "Info Edge", slugs: ["infoedge"] }, { name: "Zepto Cafe", slugs: ["zeptocafe"] }, { name: "Swish", slugs: ["swish", "swishclub"] },
  { name: "Slikk" }, { name: "Kuku", slugs: ["kuku"] }, { name: "Frontier Markets", slugs: ["frontiermarkets"] }, { name: "Citymall" }, { name: "DealShare" },
  { name: "Vahdam" }, { name: "Plum Goodness", slugs: ["plumgoodness"] }, { name: "Minimalist", slugs: ["beminimalist"] }, { name: "Wakefit" },
  { name: "The Sleep Company", slugs: ["thesleepcompany"] }, { name: "Duroflex" }, { name: "Noise", slugs: ["noise", "gonoise"] }, { name: "Fireboltt" },
  { name: "CRED Garage", slugs: ["credgarage"] }, { name: "Smallcase Technologies", slugs: ["smallcasetech"] }, { name: "Groyyo" },
  { name: "Mfine" }, { name: "Innovaccer India", slugs: ["innovaccerinc"] }, { name: "Medibuddy" }, { name: "Truemeds" }, { name: "Even Healthcare", slugs: ["even", "evenhealthcare"] },
  { name: "Pristyn" }, { name: "Cloudphysician" }, { name: "Dozee" }, { name: "Sukino" }, { name: "Allo Health", slugs: ["allohealth"] },
  { name: "Superset" }, { name: "Skit.ai", slugs: ["skit", "skitai"] }, { name: "Gnani.ai", slugs: ["gnani"] }, { name: "Sarvam" }, { name: "CoRover" },
  { name: "Mad Street Den", slugs: ["madstreetden", "vue"] }, { name: "Locus", slugs: ["locus", "locussh"] }, { name: "FarEye" }, { name: "Shipsy" },
  { name: "Unicommerce" }, { name: "Ezetap" }, { name: "Zoomcar India", slugs: ["zoomcarindia"] }, { name: "Classplus India", slugs: ["classplusapp"] },
  { name: "Doubtnut" }, { name: "Embibe" }, { name: "Byju's Exam Prep", slugs: ["byjusexamprep"] }, { name: "Lido Learning", slugs: ["lido"] },
  { name: "Airmeet" }, { name: "Springworks" }, { name: "Keka", slugs: ["keka", "kekahr"] }, { name: "greytHR", slugs: ["greythr"] }, { name: "Zimyo" },
  { name: "Recruit CRM", slugs: ["recruitcrm"] }, { name: "Peoplebox" }, { name: "Lead School", slugs: ["leadschool"] }, { name: "Clootrack" },
  { name: "Entri" }, { name: "Vedantu Innovations", slugs: ["vedantuinnovations"] }, { name: "PlayShifu" }, { name: "Bobble AI", slugs: ["bobble", "bobbleai"] },
  { name: "Josh", slugs: ["josh", "joshtalks"] }, { name: "Moj" }, { name: "Chingari" }, { name: "Trell" }, { name: "Roposo" },
  { name: "Nazara" }, { name: "Gametion" }, { name: "Loco", slugs: ["loco", "getloco"] }, { name: "FanCode" }, { name: "SportsKeeda" },
  { name: "Kotak Securities", slugs: ["kotaksecurities"] }, { name: "HDFC Bank", slugs: ["hdfcbank"] }, { name: "ICICI", slugs: ["icici"] },
  { name: "Axis Bank", slugs: ["axisbank"] }, { name: "Bajaj Finserv", slugs: ["bajajfinserv"] }, { name: "Tata 1mg Technologies", slugs: ["tata1mgtech"] },
  { name: "ServiceNow" }, { name: "Experian" }, { name: "NielsenIQ" }, { name: "Sabre" }, { name: "Expedia" }, { name: "Booking", slugs: ["bookingcom"] },
  { name: "Bosch", slugs: ["boschgroup"] }, { name: "Siemens" }, { name: "Philips" }, { name: "Publicis Sapient", slugs: ["publicissapient", "publicisgroupe"] },
  { name: "Thoughtworks" }, { name: "Gartner" }, { name: "Mastercard" }, { name: "American Express", slugs: ["americanexpress", "amex"] },
  { name: "Wise" }, { name: "Revolut" }, { name: "Deel" }, { name: "Gusto" }, { name: "Postman Inc", slugs: ["postmaninc"] }, { name: "Hackerearth" },
  { name: "Cisco" }, { name: "VMware" }, { name: "Zendesk" }, { name: "HubSpot" }, { name: "Twilio India", slugs: ["twilioindia"] },
  { name: "Freshworks Inc", slugs: ["freshworksinc"] }, { name: "LinkedIn", slugs: ["linkedin"] }, { name: "Nutanix India", slugs: ["nutanixinc"] },


  // Added Oct 2026: more startups and global companies with product teams in India.
  // New names are checked the next time discovery runs (weekly, or run the crawl with "discovery" ticked).
  { name: "Zolve" }, { name: "Dezerv" }, { name: "Univest" }, { name: "Fisdom" }, { name: "Tickertape" },
  { name: "StockGro" }, { name: "Winvesta" }, { name: "Oxyzo" }, { name: "Aye Finance" }, { name: "MoneyTap" },
  { name: "Zype" }, { name: "Capital Float" }, { name: "Yubi", slugs: ["yubi", "credavenue"] }, { name: "Eko" },
  { name: "Mswipe" }, { name: "Zaggle" }, { name: "InCred" },
  { name: "UGRO Capital", slugs: ["ugrocapital", "ugro"] }, { name: "Stashfin" },
  { name: "Urban Ladder", slugs: ["urbanladder"] }, { name: "Zivame" }, { name: "BlueStone", slugs: ["bluestone"] },
  { name: "CaratLane", slugs: ["caratlane"] }, { name: "Square Yards", slugs: ["squareyards"] },
  { name: "Magicbricks" }, { name: "Stanza Living", slugs: ["stanzaliving"] }, { name: "Furlenco" },
  { name: "RentoMojo", slugs: ["rentomojo"] }, { name: "Revv" }, { name: "Droom" }, { name: "Mokobara" },
  { name: "Giva" }, { name: "Otipy" }, { name: "Milkbasket" }, { name: "Pilgrim" },
  { name: "mCaffeine", slugs: ["mcaffeine"] }, { name: "Wow Skin Science", slugs: ["wowskinscience"] },
  { name: "Glowroad" }, { name: "Fynd" }, { name: "Tata CLiQ", slugs: ["tatacliq"] },
  { name: "Tata Play", slugs: ["tataplay"] }, { name: "JioHotstar", slugs: ["hotstar", "jiohotstar"] },
  { name: "ZEE5", slugs: ["zee5"] }, { name: "Gaana" }, { name: "JioSaavn", slugs: ["jiosaavn"] },
  { name: "Hungama" }, { name: "Moonfrog" }, { name: "Vogo" }, { name: "Shuttl" }, { name: "Zingbus" },
  { name: "EazyDiner", slugs: ["eazydiner"] }, { name: "Dineout" }, { name: "Astrotalk" }, { name: "Loadshare" },
  { name: "Xpressbees" }, { name: "Ecom Express", slugs: ["ecomexpress"] }, { name: "Rivigo" },
  { name: "Zypp Electric", slugs: ["zypp"] }, { name: "Simple Energy", slugs: ["simpleenergy"] },
  { name: "HealthKart", slugs: ["healthkart"] }, { name: "Curefoods" }, { name: "Wysa" }, { name: "Amaha" },
  { name: "YourDOST", slugs: ["yourdost"] }, { name: "Redcliffe Labs", slugs: ["redcliffelabs"] },
  { name: "Healthians" }, { name: "Orange Health", slugs: ["orangehealth"] }, { name: "Netmeds" },
  { name: "Medikabazaar" }, { name: "Zeno Health", slugs: ["zenohealth"] }, { name: "Emeritus" },
  { name: "GeeksforGeeks", slugs: ["geeksforgeeks"] }, { name: "CodeChef", slugs: ["codechef"] }, { name: "Crio" },
  { name: "Pesto" }, { name: "Kalvium" }, { name: "Coursera" }, { name: "Udemy" }, { name: "Gainsight" },
  { name: "Contentstack" }, { name: "Kapture CX", slugs: ["kapturecx"] }, { name: "Verloop" }, { name: "Turing" },
  { name: "Toplyne" }, { name: "Pepper Content", slugs: ["peppercontent"] }, { name: "Tessell" }, { name: "Sirion" },
  { name: "Pazcare" }, { name: "LambdaTest", slugs: ["lambdatest"] }, { name: "Testsigma" },
  { name: "ThoughtSpot", slugs: ["thoughtspot"] }, { name: "Pure Storage", slugs: ["purestorage"] },
  { name: "NetApp", slugs: ["netapp"] }, { name: "Commvault" }, { name: "Medallia" }, { name: "Clari" },
  { name: "Gong" }, { name: "Amplitude" }, { name: "Mixpanel" }, { name: "Snowflake" },
  { name: "New Relic", slugs: ["newrelic"] }, { name: "PagerDuty", slugs: ["pagerduty"] }, { name: "Dynatrace" },
  { name: "Zuora" }, { name: "Coupa" }, { name: "Anaplan" }, { name: "Workato" }, { name: "Sendbird" },
  { name: "Netskope" }, { name: "Fireflies.ai", slugs: ["fireflies", "firefliesai"] }, { name: "Spyne" },
  { name: "Lyzr" }, { name: "Emergent" }, { name: "Pixxel" }, { name: "Kong" }, { name: "Glean" },
];

/** Spellings to try for a company name on job-board URLs. */
export function slugVariants(c: Candidate): string[] {
  const base = c.name.toLowerCase().replace(/&/g, "and");
  const joined = base.replace(/[^a-z0-9]/g, "");
  const dashed = base.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return [...new Set([...(c.slugs ?? []), joined, dashed])].filter(Boolean);
}

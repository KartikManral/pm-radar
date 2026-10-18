// Large companies that hire PMs (and product interns) in India and run their
// careers sites on Workday. Board format: "tenant|wdN|site", copied from the
// careers URL: https://{tenant}.{wdN}.myworkdayjobs.com/{site}
// A wrong entry is skipped automatically by the crawler's health check.
import type { AtsCompany } from "../lib/config";

const W = (name: string, board: string): AtsCompany => ({ name, ats: "workday", board });

export const WORKDAY_BOARDS: AtsCompany[] = [
  W("Walmart Global Tech", "walmart|wd5|WalmartExternal"),
  W("Adobe", "adobe|wd5|external_experienced"),
  W("Adobe (students)", "adobe|wd5|external_university"),
  W("Salesforce", "salesforce|wd12|External_Career_Site"),
  W("NVIDIA", "nvidia|wd5|NVIDIAExternalCareerSite"),
  W("Intel", "intel|wd1|External"),
  W("Autodesk", "autodesk|wd1|Ext"),
  W("Mastercard", "mastercard|wd1|CorporateCareers"),
  W("Target", "target|wd5|targetcareers"),
  W("Dell", "dell|wd1|External"),
  W("HP", "hp|wd5|ExternalCareerSite"),
  W("Workday", "workday|wd5|Workday"),
  W("Broadcom", "broadcom|wd1|External_Career"),
  W("Thomson Reuters", "thomsonreuters|wd5|External_Career_Site"),
  W("Fidelity", "fmr|wd1|FidelityCareers"),
  W("PayPal", "paypal|wd1|jobs"),
  W("McAfee", "mcafee|wd1|External"),
  W("Philips", "philips|wd3|jobs-and-careers"),
  W("Motorola Solutions", "motorolasolutions|wd5|Careers"),
  W("Sprinklr", "sprinklr|wd1|careers"),
  W("Nasdaq", "nasdaq|wd1|Global_External_Site"),
  W("Zoom", "zoom|wd5|Zoom"),
  W("athenahealth", "athenahealth|wd1|External"),
  W("Wolters Kluwer", "wk|wd3|External"),
  W("Equifax", "equifax|wd5|External"),
  W("TransUnion", "transunion|wd5|TransUnion"),
  W("LSEG", "lseg|wd3|Careers"),
  W("S&P Global", "spgi|wd5|SPGI_Careers"),
  W("Elsevier", "relx|wd3|ElsevierJobs"),
];

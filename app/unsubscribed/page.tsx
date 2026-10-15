import Link from "next/link";
import { SITE_NAME } from "@/lib/config";

export default function Unsubscribed() {
  return (
    <main className="wrap simple-page">
      <h1 className="display">You're unsubscribed</h1>
      <p className="lede">You won't get daily emails from {SITE_NAME} any more. You can sign up again any time from the job list.</p>
      <Link className="btn btn-primary" href="/">
        Back to the job list
      </Link>
    </main>
  );
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  // unpdf ships its own PDF engine; keep it out of the server bundle.
  serverExternalPackages: ["unpdf"],
};
export default nextConfig;

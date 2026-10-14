import { connection } from 'next/server';

import { AuthForm } from '@/components/auth/AuthForm';
import { getSocialAuthAvailability } from '@/lib/auth/social-availability';

export default async function RegisterPage() {
  // Provider env is runtime config: never bake it into a prerendered page.
  await connection();
  const socialProviders = getSocialAuthAvailability();
  return <AuthForm mode="register" socialProviders={socialProviders} />;
}

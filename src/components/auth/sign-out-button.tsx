'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';

export function SignOutButton() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  return (
    <div className="rounded-card border border-border bg-surface p-4 shadow-card">
      {user?.email && (
        <p className="mb-3 text-sm text-text-dim">
          Signed in as <span className="font-medium text-text">{user.email}</span>
        </p>
      )}
      <button
        type="button"
        onClick={async () => {
          await signOut();
          toast.success('Signed out');
          router.replace('/login');
        }}
        className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-sm font-medium text-text transition-colors hover:border-warning hover:text-warning"
      >
        Sign out
      </button>
    </div>
  );
}

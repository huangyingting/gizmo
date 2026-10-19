import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from '@/lib/prisma';
import {
  normalizeAccountEmail,
  verifyPassword,
  writeAuditLog,
} from '@/lib/account-admission';

export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60,
  },
  pages: {
    signIn: '/sign-in',
  },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const normalizedEmail = normalizeAccountEmail(credentials?.email || '');
        const password = credentials?.password || '';
        if (!normalizedEmail || !password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { normalizedEmail },
          include: { passwordCredential: true },
        });

        if (!user || user.status !== 'ACTIVE') {
          await writeAuditLog({
            action: 'USER_SIGN_IN_FAILED',
            targetEmail: normalizedEmail,
            metadata: { reason: !user ? 'user_not_found' : 'account_disabled' },
          });
          return null;
        }

        const storedHash = user.passwordCredential?.passwordHash || user.passwordHash;
        if (!storedHash) {
          return null;
        }

        const isValid = await verifyPassword(password, storedHash);
        if (!isValid) {
          await writeAuditLog({
            action: 'USER_SIGN_IN_FAILED',
            targetUserId: user.id,
            targetEmail: normalizedEmail,
            metadata: { reason: 'invalid_password' },
          });
          return null;
        }

        await writeAuditLog({
          action: 'USER_SIGN_IN',
          actorUserId: user.id,
          targetUserId: user.id,
          targetEmail: normalizedEmail,
          metadata: { role: user.role },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          handle: user.handle,
          schoolName: user.schoolName,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = (user as { role?: string }).role || 'USER';
        token.handle = (user as { handle?: string }).handle || 'Scholar';
        token.status = 'ACTIVE';
      } else if (token.id) {
        const liveUser = await prisma.user
          .findUnique({
            where: { id: String(token.id) },
            select: { role: true, status: true, handle: true, name: true },
          })
          .catch(() => null);
        if (liveUser) {
          token.role = liveUser.role;
          token.status = liveUser.status;
          token.handle = liveUser.handle;
          if (liveUser.name) token.name = liveUser.name;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const u = session.user as {
          id?: string;
          role?: string;
          handle?: string;
          status?: string;
        };
        u.id = token.id as string;
        u.role = (token.role as string) || 'USER';
        u.handle = (token.handle as string) || 'Scholar';
        u.status = (token.status as string) || 'ACTIVE';
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || 'gizmo-ai-studio-super-secret-nextauth-key-2026',
};

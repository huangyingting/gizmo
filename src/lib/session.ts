import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.trim().toLowerCase();
  if (!email) {
    return null;
  }
  const user = await prisma.user.findUnique({
    where: { normalizedEmail: email },
    include: {
      monsters: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });
  if (!user || user.status !== 'ACTIVE') {
    return null;
  }
  return user;
}

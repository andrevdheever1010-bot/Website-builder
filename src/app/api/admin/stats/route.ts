import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [totalOrders, todayOrders, paidOrders, revenueResult] = await Promise.all([
    prisma.order.count(),
    prisma.order.count({ where: { createdAt: { gte: today } } }),
    prisma.order.count({ where: { status: { in: ['paid', 'processing', 'ready', 'delivered'] } } }),
    prisma.order.aggregate({
      where: { status: { in: ['paid', 'processing', 'ready', 'delivered'] } },
      _sum: { total: true },
    }),
  ]);

  return NextResponse.json({
    totalOrders,
    todayOrders,
    paidOrders,
    totalRevenue: revenueResult._sum.total ?? 0,
  });
}

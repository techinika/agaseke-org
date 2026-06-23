'use client';

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Transaction } from '@/types/transaction';
import { CURRENCY } from '@/lib/constants';
import { format, startOfMonth } from 'date-fns';

interface FinanceChartsProps {
  transactions: Transaction[];
  isLoading: boolean;
}

const COLORS = ['#FF0000', '#16a34a', '#888888', '#111111'];

export function FinanceCharts({ transactions }: FinanceChartsProps) {
  const monthlyData = useMemo(() => {
    const byMonth = new Map<string, { membership: number; donation: number }>();
    transactions.forEach((txn) => {
      if (txn.status !== 'completed') return;
      const key = format(startOfMonth(txn.createdAt.toDate()), 'MMM yyyy');
      const existing = byMonth.get(key) ?? { membership: 0, donation: 0 };
      if (txn.type === 'membership') {
        existing.membership += txn.amount;
      } else {
        existing.donation += txn.amount;
      }
      byMonth.set(key, existing);
    });
    return Array.from(byMonth.entries())
      .map(([month, data]) => ({ month, ...data }))
      .slice(-6);
  }, [transactions]);

  const typeData = useMemo(() => {
    const membership = transactions
      .filter((t) => t.status === 'completed' && t.type === 'membership')
      .reduce((sum, t) => sum + t.amount, 0);
    const donation = transactions
      .filter((t) => t.status === 'completed' && t.type === 'donation')
      .reduce((sum, t) => sum + t.amount, 0);
    return [
      { name: 'Memberships', value: membership },
      { name: 'Donations', value: donation },
    ];
  }, [transactions]);

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No transaction data available yet.
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Revenue by Month</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" className="text-xs" tick={{ fontSize: 12 }} />
                <YAxis className="text-xs" tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value: number) => [`${value.toLocaleString()} ${CURRENCY}`, undefined]}
                />
                <Bar dataKey="membership" name="Memberships" fill="#FF0000" radius={[4, 4, 0, 0]} />
                <Bar dataKey="donation" name="Donations" fill="#16a34a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Revenue by Type</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={typeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {typeData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => [`${value.toLocaleString()} ${CURRENCY}`, undefined]}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

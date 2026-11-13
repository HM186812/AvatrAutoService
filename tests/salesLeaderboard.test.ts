import test from 'node:test';
import assert from 'node:assert/strict';
import * as leaderboardMod from '../src/utils/salesLeaderboard';

test('salesLeaderboard exports mergeCloudLeaderboardStats helper combining cloud totals cleanly', () => {
  assert.equal(
    typeof (leaderboardMod as Record<string, unknown>).mergeCloudLeaderboardStats,
    'function',
    'Expected mergeCloudLeaderboardStats export in src/utils/salesLeaderboard.ts',
  );

  const mergeCloudLeaderboardStats = (leaderboardMod as any).mergeCloudLeaderboardStats;
  const localStats = [
    {
      repName: 'Rep A',
      avatarInitials: 'RA',
      totalUnits: 1,
      totalRevenueUSD: 40000,
      totalRevenueLAK: 880000000,
      avgDealSizeUSD: 40000,
      deliveredLeadsCount: 1,
      activeLeadsCount: 2,
      conversionRate: 33,
      salesBreakdown: [
        {
          id: 'b1',
          billNumber: 'INV-2026-00001',
          customerName: 'Alice',
          customerPhone: '020111',
          model: 'AVATR 07',
          vin: 'LL111',
          amountUSD: 40000,
          amountLAK: 880000000,
          paymentMethod: 'cash',
          date: '2026-11-10',
        },
      ],
    },
  ];
  const cloudRows = [
    { staff_id: 'u1', staff_name: 'Rep A', role: 'sales', delivered_units: 1, total_revenue_usd: 40000, avg_discount_usd: 0 },
    { staff_id: 'u2', staff_name: 'Rep B', role: 'sales', delivered_units: 3, total_revenue_usd: 135000, avg_discount_usd: 500 },
  ];

  const merged = mergeCloudLeaderboardStats(localStats, cloudRows, [], 'month', new Date(), 23000);
  assert.equal(merged.length, 2);
  assert.equal(merged[0].repName, 'Rep B');
  assert.equal(merged[0].totalUnits, 3);
  assert.equal(merged[0].totalRevenueUSD, 135000);
  assert.equal(merged[0].totalRevenueLAK, Math.round(135000 * 23000));
  assert.equal(merged[0].salesBreakdown.length, 0);
  assert.equal(merged[1].repName, 'Rep A');
  assert.equal(merged[1].salesBreakdown.length, 1);

  assert.equal(
    (leaderboardMod as any).getCloudSalesSyncKey(
      [{ status: 'completed' }, { status: 'voided' }],
      [{ status: 'delivered' }, { status: 'new' }],
    ),
    '2:1:1',
  );
});

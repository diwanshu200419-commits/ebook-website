const CREATOR_REVENUE_SHARE = 0.82;
const PLATFORM_REVENUE_SHARE = 0.18;

function roundMoney(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

function getRevenueSplit(amount) {
  const total = roundMoney(amount);
  const creatorAmount = roundMoney(total * CREATOR_REVENUE_SHARE);
  const platformFee = roundMoney(total - creatorAmount);

  return {
    total,
    creatorAmount,
    platformFee,
  };
}

module.exports = {
  CREATOR_REVENUE_SHARE,
  PLATFORM_REVENUE_SHARE,
  getRevenueSplit,
  roundMoney,
};

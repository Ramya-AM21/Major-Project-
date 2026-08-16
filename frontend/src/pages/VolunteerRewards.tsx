import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Award, CheckCircle, Tag, Clock, AlertTriangle, AlertCircle, Sparkles, Receipt, Percent } from 'lucide-react';
import axios from 'axios';
import communityRewardImg from '../assets/community_reward.png';

interface RestaurantReward {
  id: string;
  restaurantName: string;
  description: string;
  requiredCoins: number;
  discountPercentage: number;
  validUntil: string;
}

interface RewardRedemption {
  id: string;
  redemptionCode: string;
  redeemedAt: string;
  restaurantReward: RestaurantReward;
}

export const VolunteerRewards: React.FC = () => {
  const { user } = useAuth();
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [catalog, setCatalog] = useState<RestaurantReward[]>([]);
  const [redemptions, setRedemptions] = useState<RewardRedemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [successRedemption, setSuccessRedemption] = useState<RewardRedemption | null>(null);

  const loadRewardsData = async () => {
    try {
      const authHeader = `Bearer ${localStorage.getItem('token')}`;
      axios.defaults.headers.common['Authorization'] = authHeader;

      const [statsRes, catalogRes, redemptionsRes] = await Promise.all([
        axios.get('/api/v1/analytics/volunteer'),
        axios.get('/api/v1/rewards'),
        axios.get('/api/v1/rewards/redemptions')
      ]);

      setWalletBalance(statsRes.data.tokens || 0);
      setCatalog(catalogRes.data || []);
      setRedemptions(redemptionsRes.data || []);
      setErrorText(null);
    } catch (e: any) {
      console.error(e);
      setErrorText("Failed to retrieve rewards ledger data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRewardsData();
  }, []);

  const handleRedeem = async (reward: RestaurantReward) => {
    if (walletBalance < reward.requiredCoins) {
      setErrorText(`Insufficient balance. You need ${reward.requiredCoins} points to claim this discount.`);
      return;
    }

    if (!window.confirm(`Deduct ${reward.requiredCoins} points to redeem a "${reward.restaurantName}" voucher?`)) {
      return;
    }

    try {
      setErrorText(null);
      const res = await axios.post(`/api/v1/rewards/${reward.id}/redeem`);
      setSuccessRedemption(res.data);
      loadRewardsData();
    } catch (err: any) {
      setErrorText(err.response?.data?.message || "Failed to process reward redemption.");
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-left border-b border-natural-border pb-5">
        <div>
          <h1 className="text-2xl font-display font-black text-natural-text tracking-tight flex items-center gap-2 uppercase">
            <Sparkles className="w-6 h-6 text-accent-500 fill-accent-500 shrink-0" /> Kitchen Partner Coupons
          </h1>
          <p className="text-xs text-natural-muted mt-0.5 font-semibold">Exchange your verified delivery tokens for discount coupon codes at local restaurants</p>
        </div>

        {/* Balance Card styled like Shopify metrics */}
        <div className="bg-white border border-natural-border py-2 px-4 rounded-xl flex items-center space-x-3 text-left shadow-xs self-start sm:self-auto min-w-[170px]">
          <div className="w-10 h-10 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center font-bold text-xl text-brand-700">🪙</div>
          <div>
            <span className="text-[9px] uppercase font-black text-natural-muted block leading-none">Wallet Balance</span>
            <span className="text-xs font-mono font-black text-natural-text mt-1.5 block leading-none">{walletBalance} points</span>
          </div>
        </div>
      </div>

      <div className="bg-white border border-natural-border p-4 rounded-2xl flex items-center space-x-4 shadow-xs">
        <div className="flex-1 text-left">
          <h3 className="font-display font-black text-xs uppercase tracking-wider text-natural-text">Eco-Contribution Rewards</h3>
          <p className="text-[10px] text-natural-muted leading-relaxed font-semibold mt-1">
            Redeem your accrued tokens for coupon vouchers at partner dining spots. Each point reflects CO2 offset savings and organic food rescued along commutes.
          </p>
        </div>
        <div className="w-20 h-20 shrink-0 rounded-xl bg-brand-50/50 border border-brand-150 overflow-hidden flex items-center justify-center p-1.5">
          <img src={communityRewardImg} alt="Community Reward Illustration" className="w-full h-full object-contain rounded-lg" />
        </div>
      </div>

      {errorText && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-750 flex items-start space-x-2.5 text-left font-semibold">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-650 mt-0.5" />
          <span>{errorText}</span>
        </div>
      )}

      {/* Success Modal/Notice when redeemed */}
      {successRedemption && (
        <div className="p-5 rounded-2xl bg-brand-50 border border-brand-100 text-left space-y-3.5 relative overflow-hidden transition-all shadow-xs animate-in slide-in-from-top-4 duration-200">
          <div className="flex items-center space-x-2 text-brand-750 font-bold">
            <CheckCircle className="w-5 h-5 shrink-0" />
            <h3 className="text-xs font-display uppercase tracking-wider">Coupon Redeemed Successfully!</h3>
          </div>
          <p className="text-xs text-brand-650 font-semibold leading-relaxed">
            Your discount voucher for <strong>{successRedemption.restaurantReward.restaurantName}</strong> has been generated. Provide the code below at checkout.
          </p>
          <div className="p-4 bg-white border border-brand-200 rounded-xl max-w-sm flex items-center justify-between shadow-xs">
            <div>
              <span className="text-[9px] text-natural-muted block font-bold uppercase tracking-wider">Discount Code</span>
              <strong className="text-xl font-mono text-natural-text tracking-widest">{successRedemption.redemptionCode}</strong>
            </div>
            <span className="text-xs font-bold text-brand-700 bg-brand-50 border border-brand-100 px-3 py-1.5 rounded-lg uppercase font-mono">
              {successRedemption.restaurantReward.discountPercentage}% OFF
            </span>
          </div>
          <button
            onClick={() => setSuccessRedemption(null)}
            className="absolute top-2 right-4 text-xs font-bold text-brand-700 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-natural-muted flex flex-col items-center justify-center space-y-2.5 bg-white rounded-xl border border-natural-border shadow-xs">
          <div className="w-7 h-7 rounded-full border-3 border-brand-200 border-t-brand-600 animate-spin"></div>
          <span className="text-xs font-semibold">Loading partner catalog...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left panel: Active Catalog Vouchers list */}
          <div className="lg:col-span-7 space-y-4">
            <h3 className="font-display font-bold text-xs uppercase tracking-wider text-natural-text text-left">Available Redemptions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {catalog.map((itm) => {
                const canAfford = walletBalance >= itm.requiredCoins;
                return (
                  <div key={itm.id} className="bg-white border-2 border-dashed border-natural-border rounded-2xl p-5 shadow-xs text-left flex flex-col justify-between space-y-5 hover:border-brand-400 transition-colors relative">
                    {/* Visual coupon notch */}
                    <div className="absolute -left-3 top-1/2 -mt-2.5 w-5 h-5 bg-natural-bg border-r border-natural-border rounded-full pointer-events-none"></div>
                    <div className="absolute -right-3 top-1/2 -mt-2.5 w-5 h-5 bg-natural-bg border-l border-natural-border rounded-full pointer-events-none"></div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <span className="text-[9px] bg-brand-50 border border-brand-100 text-brand-700 font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                          <Percent className="w-3 h-3" /> {itm.discountPercentage}% Discount
                        </span>
                        <span className="text-xs font-mono font-black text-natural-text flex items-center gap-1">
                          🪙 {itm.requiredCoins} pts
                        </span>
                      </div>
                      <h4 className="font-display font-bold text-sm text-natural-text pt-2 border-t border-natural-border/60">{itm.restaurantName}</h4>
                      <p className="text-xs text-natural-muted font-semibold leading-relaxed">{itm.description}</p>
                    </div>

                    <button
                      onClick={() => handleRedeem(itm)}
                      disabled={!canAfford}
                      className={canAfford ? 'btn-primary w-full text-[10px] py-2' : 'btn-secondary w-full cursor-not-allowed opacity-50 text-[10px] py-2'}
                    >
                      <Tag className="w-3.5 h-3.5 mr-1 shrink-0" /> Claim Voucher
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right panel: History of Redemptions */}
          <div className="lg:col-span-5 bg-white border border-natural-border rounded-2xl p-5 shadow-xs text-left flex flex-col space-y-4">
            <div className="border-b border-natural-border pb-3 flex items-center gap-1.5">
              <Receipt className="w-4 h-4 text-brand-650" />
              <div>
                <h3 className="font-display font-bold text-xs uppercase tracking-wider text-natural-text">Redeemed Coupons</h3>
                <p className="text-[10px] text-natural-muted mt-0.5 font-semibold">Active codes generated by your profile account</p>
              </div>
            </div>

            {redemptions.length === 0 ? (
              <div className="p-8 text-center text-natural-muted text-xs font-semibold">
                You haven't claimed any restaurant vouchers yet. Complete verified deliveries to earn points!
              </div>
            ) : (
              <div className="divide-y divide-natural-border max-h-[380px] overflow-y-auto pr-1">
                {redemptions.map((red) => (
                  <div key={red.id} className="py-3.5 flex justify-between items-center text-xs gap-3">
                    <div className="min-w-0">
                      <strong className="text-natural-text block font-bold truncate uppercase">{red.restaurantReward.restaurantName}</strong>
                      <span className="text-[10px] text-natural-muted block mt-1 font-semibold flex items-center gap-1">
                        <Clock className="w-3 h-3 text-natural-muted" /> Claimed {new Date(red.redeemedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <code className="text-xs font-mono font-black text-accent-700 bg-accent-50 border border-accent-100 rounded px-2.5 py-0.5 block tracking-widest">{red.redemptionCode}</code>
                      <span className="text-[9px] text-[#1C4030] font-bold mt-1.5 block uppercase text-center tracking-widest bg-brand-50 border border-brand-100 rounded">
                        {red.restaurantReward.discountPercentage}% OFF
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
};

export default VolunteerRewards;

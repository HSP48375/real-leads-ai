import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Package, TrendingUp, DollarSign, Play, MessageCircle, Download, ArrowRight, Star } from 'lucide-react';
import { toast } from 'sonner';

interface DashboardStats {
  totalOrders: number;
  totalLeads: number;
  totalSpent: number;
}

const Dashboard = () => {
  const { user } = useAuth();
  const [userName, setUserName] = useState('');
  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0,
    totalLeads: 0,
    totalSpent: 0,
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    };
    fetchUserProfile();
    fetchDashboardData();
  }, [user]);

  // Realtime updates: refresh dashboard when orders related to this user change
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('orders-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
        const row: any = payload.new ?? payload.old;
        if (!row) return;
        if (row.user_id === user.id || row.customer_email === user.email) {
          console.log('Realtime update for your orders detected, refreshing stats...');
          fetchDashboardData();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchUserProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user!.id)
        .maybeSingle();

      if (error) throw error;
      setUserName(data?.full_name || '');
    } catch (error: any) {
      console.error('Failed to load profile');
    }
  };

  const fetchDashboardData = async () => {
    if (!user?.email) {
      console.log('No user email, skipping fetch');
      setLoading(false);
      return;
    }

    try {
      console.log('Fetching orders for user:', user.email);
      console.log('Auth user debug:', { id: user.id, email: user.email });
      
      const { data: orders, error } = await supabase
        .from('orders')
        .select('*')
        .or(`user_id.eq.${user.id},customer_email.eq.${user.email}`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Raw orders from database:', orders);

      const totalOrders = orders?.length || 0;
      const totalLeads = orders?.reduce((sum, order) => sum + (order.leads_count || 0), 0) || 0;
      const totalSpent = orders?.reduce((sum, order) => sum + (order.price_paid || 0), 0) || 0;

      console.log('Calculated stats:', { totalOrders, totalLeads, totalSpent });

      setStats({ totalOrders, totalLeads, totalSpent });
      setRecentOrders(orders?.slice(0, 5) || []);
    } catch (error: any) {
      console.error('Error in fetchDashboardData:', error);
      setStats({ totalOrders: 0, totalLeads: 0, totalSpent: 0 });
      setRecentOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const getPriceForTier = (tier: string) => {
    const prices: Record<string, number> = {
      starter: 97,
      growth: 297,
      pro: 597,
      enterprise: 1297,
    };
    return prices[tier] || 0;
  };

  const getTierLabel = (tier: string) => {
    const labels: Record<string, string> = {
      starter: 'Starter (50 leads)',
      growth: 'Growth (200 leads)',
      pro: 'Pro (500 leads)',
      enterprise: 'Enterprise (1500 leads)',
    };
    return labels[tier] || tier;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getTimeBasedGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const handleDownloadSample = () => {
    const sampleCSV = `Name,Address,City,State,ZIP,Phone,Price,Date Listed,URL
John Smith,123 Main St,Detroit,MI,48201,(313) 555-0100,$350000,2024-01-15,https://example.com
Jane Doe,456 Oak Ave,Ann Arbor,MI,48103,(734) 555-0200,$425000,2024-01-14,https://example.com
Mike Johnson,789 Elm St,Royal Oak,MI,48067,(248) 555-0300,$275000,2024-01-13,https://example.com`;
    
    const blob = new Blob([sampleCSV], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample-fsbo-leads.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    toast.success('Sample CSV downloaded');
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  const statsCards = [
    {
      label: 'Total Orders',
      value: stats.totalOrders,
      icon: Package,
      trend: '+12%',
      color: 'text-primary',
    },
    {
      label: 'Total Leads',
      value: stats.totalLeads,
      icon: TrendingUp,
      trend: '+24%',
      color: 'text-primary',
    },
    {
      label: 'Total Spent',
      value: `$${stats.totalSpent.toLocaleString()}`,
      icon: DollarSign,
      trend: '+8%',
      color: 'text-primary',
    },
  ];

  const quickActions = [
    {
      title: 'Download Sample CSV',
      description: 'See what our lead data looks like',
      icon: Download,
      onClick: handleDownloadSample,
    },
    {
      title: 'Watch Tutorial',
      description: 'Learn how to use your leads effectively',
      icon: Play,
      onClick: () => toast.info('Tutorial coming soon!'),
    },
    {
      title: 'Contact Support',
      description: "Questions? We're here to help",
      icon: MessageCircle,
      onClick: () => window.location.href = 'mailto:hello@realtyleadsai.com',
    },
  ];


  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Welcome Message */}
        <div className="animate-fade-in">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            {getTimeBasedGreeting()}, {userName || 'there'}!
          </h1>
          <p className="text-muted-foreground text-lg">Here's your account overview</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {statsCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card
                key={stat.label}
                className="relative overflow-hidden bg-gradient-to-br from-[#1f2937] to-[#111827] border border-primary/20 rounded-xl shadow-lg hover:scale-[1.02] transition-all duration-300 hover:shadow-[0_0_30px_rgba(255,215,0,0.3)] group"
                style={{
                  animation: `fade-in 0.5s ease-out ${index * 0.1}s both`,
                }}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-muted-foreground uppercase tracking-wide">
                      {stat.label}
                    </span>
                    <Icon className="h-8 w-8 text-primary" style={{ filter: 'drop-shadow(0 0 8px rgba(255, 215, 0, 0.5))' }} />
                  </div>
                  <div className="text-5xl font-bold text-foreground mb-2">
                    {stat.value}
                  </div>
                  <div className="text-sm text-green-500 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    <span>{stat.trend} this month</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <Card
                key={action.title}
                onClick={action.onClick}
                className="cursor-pointer bg-gradient-to-br from-[#1f2937] to-[#111827] border border-primary/20 rounded-xl hover:scale-[1.02] transition-all duration-300 hover:shadow-[0_0_20px_rgba(255,215,0,0.2)]"
              >
                <CardContent className="p-6 flex items-start gap-4">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground mb-1">{action.title}</h3>
                    <p className="text-sm text-muted-foreground">{action.description}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Ready for More Leads */}
        <Card className="relative overflow-hidden bg-gradient-to-br from-[#1f2937] to-[#111827] border-2 border-primary rounded-xl shadow-[0_0_30px_rgba(255,215,0,0.3)]">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjE1LDAsMC4wNSkiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-30"></div>
          <CardContent className="relative p-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex-1 text-center md:text-left">
                <h2 className="text-3xl font-bold text-foreground mb-3">
                  Ready for More Leads?
                </h2>
                <p className="text-lg text-muted-foreground mb-4">
                  Get verified FSBO leads delivered to your inbox within 24 hours
                </p>
                <div className="flex items-center justify-center md:justify-start gap-2 text-primary">
                  <Star className="h-5 w-5 fill-primary" />
                  <span className="font-medium">Join 527+ agents closing more deals</span>
                </div>
              </div>
              <Link to="/order">
                <Button 
                  size="lg"
                  className="px-8 py-6 text-lg font-semibold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all duration-300 hover:scale-105 hover:shadow-[0_10px_40px_rgba(255,215,0,0.4)] group"
                >
                  Order New Leads
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Recent Orders */}
        <Card className="bg-card border border-border rounded-xl">
          <CardContent className="p-6">
            <h2 className="text-2xl font-bold text-foreground mb-6">Recent Orders</h2>
            
            {recentOrders.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground mb-6 text-lg">No orders yet</p>
                <Link to="/order">
                  <Button size="lg" className="px-8">Order Your First Leads</Button>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Date</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Territory</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Leads</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Amount</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map((order, index) => (
                      <tr 
                        key={order.id} 
                        className={`border-b border-border ${index % 2 === 0 ? 'bg-muted/5' : ''}`}
                      >
                        <td className="py-4 px-4 text-sm">{formatDate(order.created_at)}</td>
                        <td className="py-4 px-4 font-medium">{order.primary_city}</td>
                        <td className="py-4 px-4 text-sm">{order.leads_count || 0}</td>
                        <td className="py-4 px-4 font-medium">${getPriceForTier(order.tier)}</td>
                        <td className="py-4 px-4">
                          {order.status === 'delivered' ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-500">
                              ✓ Delivered
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-500 animate-pulse">
                              Processing
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <Link to="/orders">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-primary hover:text-primary/80 hover:bg-primary/10"
                            >
                              View Details →
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {recentOrders.length >= 5 && (
                  <div className="mt-6 text-center">
                    <Link to="/orders" className="text-primary hover:underline font-medium">
                      View All Orders →
                    </Link>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;

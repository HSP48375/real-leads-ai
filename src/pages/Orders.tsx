import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Download, Search } from 'lucide-react';
import { toast } from 'sonner';

const Orders = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user]);

  useEffect(() => {
    // Add timeout for loading state
    const timeout = setTimeout(() => {
      if (loading) {
        setLoading(false);
        setError('Request timed out. Please refresh the page.');
      }
    }, 5000);

    return () => clearTimeout(timeout);
  }, [loading]);

  useEffect(() => {
    if (searchTerm) {
      const filtered = orders.filter(order =>
        (order.primary_city || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredOrders(filtered);
    } else {
      setFilteredOrders(orders);
    }
  }, [searchTerm, orders]);

  const fetchOrders = async () => {
    if (!user?.email) {
      setError('No user email found');
      setLoading(false);
      return;
    }

    try {
      console.log('Fetching orders for:', user.email);
      
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('customer_email', user.email)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Orders fetched:', data?.length || 0);
      setOrders(data || []);
      setFilteredOrders(data || []);
      setError(null);
    } catch (error: any) {
      console.error('Failed to load orders:', error);
      setError(error.message || 'Failed to load orders');
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const getPriceForTier = (tier: string) => {
    const prices: Record<string, number> = {
      starter: 97,
      growth: 197,
      pro: 397,
      enterprise: 597,
    };
    return prices[tier] || 0;
  };

  const getTierLabel = (tier: string) => {
    const labels: Record<string, string> = {
      starter: 'Starter (20-25 leads)',
      growth: 'Growth (40-60 leads)',
      pro: 'Pro (80-100 leads)',
      enterprise: 'Enterprise (120-150 leads/month)',
    };
    return labels[tier] || tier;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleDownload = async (order: any) => {
    if (order.status !== 'delivered' || !order.sheet_url) {
      toast.error('Leads are still being processed');
      return;
    }

    try {
      // Fetch leads for this order
      const { data: leads, error } = await supabase
        .from('leads')
        .select('*')
        .eq('order_id', order.id);

      if (error) throw error;

      if (!leads || leads.length === 0) {
        toast.error('No leads found for this order');
        return;
      }

      // Convert to CSV
      const headers = ['Name', 'Address', 'City', 'State', 'ZIP', 'Phone', 'Price', 'Date Listed', 'URL'];
      const csvContent = [
        headers.join(','),
        ...leads.map(lead =>
          [
            lead.seller_name || '',
            lead.address || '',
            lead.city || '',
            lead.state || '',
            lead.zip || '',
            lead.contact || '',
            lead.price || '',
            lead.date_listed ? new Date(lead.date_listed).toLocaleDateString() : '',
            lead.url || '',
          ].join(',')
        ),
      ].join('\n');

      // Download
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${order.primary_city}-leads-${new Date(order.created_at).toLocaleDateString()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success('Leads downloaded successfully');
    } catch (error: any) {
      toast.error('Failed to download leads');
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Loading your orders...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <p className="text-destructive">{error}</p>
          <Button onClick={fetchOrders}>Retry</Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Order History</h1>
          <p className="text-muted-foreground">
            View and download all your lead orders
          </p>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by city..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Orders Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredOrders.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  {searchTerm ? 'No orders found matching your search' : 'No orders yet'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Date</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">City</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Tier</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Leads</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Amount</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Action</th>
                    </tr>
                  </thead>
                   <tbody>
                    {filteredOrders.map((order) => (
                      <tr key={order.id} className="border-b border-border">
                        <td className="py-3 px-4 text-sm">{formatDate(order.created_at)}</td>
                        <td className="py-3 px-4 font-medium">{order.primary_city}</td>
                        <td className="py-3 px-4 text-sm">{getTierLabel(order.tier)}</td>
                        <td className="py-3 px-4 text-sm">{order.leads_count || 0}</td>
                        <td className="py-3 px-4 font-medium">${getPriceForTier(order.tier)}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              order.status === 'delivered'
                                ? 'bg-green-500/10 text-green-500'
                                : 'bg-yellow-500/10 text-yellow-500'
                            }`}
                          >
                            {order.status === 'delivered' ? 'Delivered' : 'Processing (15-30 min)'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownload(order)}
                            disabled={order.status !== 'delivered'}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Orders;

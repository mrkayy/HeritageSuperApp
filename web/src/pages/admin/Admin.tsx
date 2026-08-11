import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  Users,
  Heart,
  MessageSquare,
  Building,
  TrendingUp,
  Calendar,
  MapPin,
  Trophy,
  Clock
} from 'lucide-react';
import api from '@/lib/api';
import { toast } from '@/hooks/use-toast';

interface DashboardStats {
  followUpProgress: any[];
  inviteStats: any[];
  localChurchCount: number;
  userCount: number;
  recentOutreachActivity: any[];
  responseStatusSummary: any[];
  weeklyOutreachSummary: any[];
  teamRanking: any[];
}

const Admin = () => {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats>({
    followUpProgress: [],
    inviteStats: [],
    localChurchCount: 0,
    userCount: 0,
    recentOutreachActivity: [],
    responseStatusSummary: [],
    weeklyOutreachSummary: [],
    teamRanking: []
  });
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const { data } = await api.get('/dashboard/admin');

      setStats({
        followUpProgress: data.followUpProgress || [],
        inviteStats: data.inviteStats || [],
        localChurchCount: data.localChurchCount || 0,
        userCount: data.userCount || 0,
        recentOutreachActivity: data.recentOutreachActivity || [],
        responseStatusSummary: data.responseStatusSummary || [],
        weeklyOutreachSummary: data.weeklyOutreachSummary || [],
        teamRanking: data.teamRanking || []
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch dashboard data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && ['super_admin', 'church_admin'].includes(user.role)) {
      fetchDashboardData();
    }
  }, [user]);

  // Check permissions
  if (!user || !['super_admin', 'church_admin'].includes(user.role)) {
    return (
      <div className="p-4 md:p-6">
        <Card className="glass-card">
          <CardContent className="p-6 md:p-8 text-center">
            <Shield className="h-12 w-12 md:h-16 md:w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-lg md:text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-sm md:text-base text-muted-foreground">You don&apos;t have permission to access this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // const fetchDashboardData = async () => {
  //   try {
  //     setLoading(true);

  //     const { data } = await api.get('/dashboard/admin');

  //     setStats({
  //       followUpProgress: data.followUpProgress || [],
  //       inviteStats: data.inviteStats || [],
  //       localChurchCount: data.localChurchCount || 0,
  //       userCount: data.userCount || 0,
  //       recentOutreachActivity: data.recentOutreachActivity || [],
  //       responseStatusSummary: data.responseStatusSummary || [],
  //       weeklyOutreachSummary: data.weeklyOutreachSummary || [],
  //       teamRanking: data.teamRanking || []
  //     });
  //   } catch (error) {
  //     console.error('Error fetching dashboard data:', error);
  //     toast({
  //       title: "Error",
  //       description: "Failed to fetch dashboard data",
  //       variant: "destructive"
  //     });
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  if (loading) {
    return (
      <div className="p-4 md:p-6">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
          <Shield className="h-5 w-5 md:h-6 md:w-6 text-primary" />
          Admin Dashboard
        </h1>
        <p className="text-sm md:text-base text-muted-foreground">Overview of system statistics and activities</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        <Card className="glass-card">
          <CardContent className="p-3 md:p-6">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Building className="h-4 w-4 md:h-6 md:w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">Churches</p>
                <p className="text-lg md:text-2xl font-bold">{stats.localChurchCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-3 md:p-6">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-green-100 rounded-lg">
                <Users className="h-4 w-4 md:h-6 md:w-6 text-green-600" />
              </div>
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">Users</p>
                <p className="text-lg md:text-2xl font-bold">{stats.userCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-3 md:p-6">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-red-100 rounded-lg">
                <Heart className="h-4 w-4 md:h-6 md:w-6 text-red-600" />
              </div>
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">Souls</p>
                <p className="text-lg md:text-2xl font-bold">
                  {stats.responseStatusSummary.reduce((sum, item) => sum + (item.count || 0), 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-3 md:p-6">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-purple-100 rounded-lg">
                <MessageSquare className="h-4 w-4 md:h-6 md:w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">Follow-ups</p>
                <p className="text-lg md:text-2xl font-bold">
                  {stats.followUpProgress.reduce((sum, item) => sum + (item.total_follow_ups || 0), 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Response Status Summary */}
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base md:text-lg">Response Status Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats.responseStatusSummary.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data available</p>
            ) : (
              stats.responseStatusSummary.map((item, index) => (
                <div key={index} className="flex justify-between items-center p-2 bg-white/50 rounded">
                  <span className="text-sm font-medium capitalize">{item.response_status}</span>
                  <Badge variant="outline">{item.count}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Team Ranking */}
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base md:text-lg flex items-center gap-2">
              <Trophy className="h-4 w-4 md:h-5 md:w-5" />
              Team Ranking
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats.teamRanking.length === 0 ? (
              <p className="text-sm text-muted-foreground">No rankings available</p>
            ) : (
              stats.teamRanking.map((team, index) => (
                <div key={index} className="flex justify-between items-center p-2 bg-white/50 rounded">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">#{index + 1}</span>
                    <span className="text-sm">{team.team_name}</span>
                  </div>
                  <Badge>{team.total_souls} souls</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Weekly Outreach Summary */}
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base md:text-lg flex items-center gap-2">
              <Calendar className="h-4 w-4 md:h-5 md:w-5" />
              Weekly Outreach
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats.weeklyOutreachSummary.length === 0 ? (
              <p className="text-sm text-muted-foreground">No outreach data</p>
            ) : (
              stats.weeklyOutreachSummary.slice(0, 4).map((week, index) => (
                <div key={index} className="flex justify-between items-center p-2 bg-white/50 rounded">
                  <span className="text-sm">Week {week.week_number}</span>
                  <Badge variant="outline">{week.total_souls} souls</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Recent Outreach Activity */}
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base md:text-lg flex items-center gap-2">
              <Clock className="h-4 w-4 md:h-5 md:w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-64 overflow-y-auto">
            {stats.recentOutreachActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent activity</p>
            ) : (
              stats.recentOutreachActivity.map((activity, index) => (
                <div key={index} className="p-2 bg-white/50 rounded">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium">{activity.full_name}</p>
                      <p className="text-xs text-muted-foreground">{activity.added_by}</p>
                    </div>
                    <Badge className="text-xs">
                      {activity.response_status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(activity.outreach_date).toLocaleDateString()}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Follow-up Progress */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg md:text-xl flex items-center gap-2">
            <TrendingUp className="h-5 w-5 md:h-6 md:w-6" />
            Follow-up Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats.followUpProgress.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No follow-up data available</p>
          ) : (
            <div className="overflow-x-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {stats.followUpProgress.map((progress, index) => (
                  <div key={index} className="p-4 bg-white/50 rounded-lg">
                    <h4 className="font-medium text-sm md:text-base">{progress.assigned_to}</h4>
                    <div className="mt-2 space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>Total:</span>
                        <span>{progress.total_follow_ups}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Pending:</span>
                        <span>{progress.pending_follow_ups}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Completed:</span>
                        <span>{progress.completed_follow_ups}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Admin;

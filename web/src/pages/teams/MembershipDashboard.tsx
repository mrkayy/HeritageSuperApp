import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MembershipService, Member } from '@/services/membershipService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Users, 
  Cake, 
  Heart, 
  TrendingUp, 
  UserPlus, 
  Calendar, 
  ArrowRight, 
  Sparkles,
  ShieldCheck,
  Building,
  ChevronRight
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const STAGES = [
  { key: 'first_time_guest', label: 'First Time Guest' },
  { key: 'foundation_class', label: 'Foundation Class' },
  { key: 'sunday_school_module_1', label: 'Sunday School 1' },
  { key: 'sunday_school_module_2', label: 'Sunday School 2' },
  { key: 'sunday_school_module_3', label: 'Sunday School 3' },
  { key: 'membership_class', label: 'Membership Class' },
  { key: 'stewardship', label: 'Stewardship' },
  { key: 'mit', label: 'MIT' },
  { key: 'resident_pastor', label: 'Resident Pastor' },
];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function MembershipDashboard() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    try {
      setLoading(true);
      const data = await MembershipService.fetchMembers();
      setMembers(data);
    } catch (err) {
      console.error(err);
      toast({
        title: "Error loading dashboard",
        description: "Failed to fetch membership records",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const currentMonthNum = new Date().getMonth() + 1; // 1-12
  const currentMonthName = MONTH_NAMES[currentMonthNum - 1];

  // Birthday counts
  const birthdaysThisMonth = members.filter(
    m => m.dateOfBirthMonth === currentMonthNum
  );

  // Anniversary counts
  const anniversariesThisMonth = members.filter(
    m => m.weddingAnniversaryMonth === currentMonthNum
  );

  // Stage Breakdown
  const stageCounts: Record<string, number> = {};
  members.forEach(m => {
    const stage = m.currentStage || 'first_time_guest';
    stageCounts[stage] = (stageCounts[stage] || 0) + 1;
  });

  // Recent Members (created in last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const newMembersThisMonth = members.filter(m => {
    if (!m.createdAt) return false;
    return new Date(m.createdAt) >= thirtyDaysAgo;
  });

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 glass-card p-6 rounded-2xl border border-border/50">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-primary border-primary/30">
              <ShieldCheck className="w-3 h-3 mr-1 text-primary" />
              Membership & Information Center
            </Badge>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight mt-2 text-foreground">
            Membership Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Overview of church directory, member engagement funnel, and monthly celebrations.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/teams/membership/members">
              <Users className="w-4 h-4 mr-2 text-primary" />
              Manage Members
            </Link>
          </Button>
          <Button asChild size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Link to="/teams/membership/journey">
              <TrendingUp className="w-4 h-4 mr-2" />
              Member Journey
            </Link>
          </Button>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass-card hover:border-primary/40 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Members</CardTitle>
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <Users className="w-5 h-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{loading ? '...' : members.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Active profiled members in directory
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card hover:border-pink-500/40 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Birthdays ({currentMonthName})
            </CardTitle>
            <div className="p-2.5 rounded-xl bg-pink-500/10 text-pink-500">
              <Cake className="w-5 h-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{loading ? '...' : birthdaysThisMonth.length}</div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-muted-foreground">Celebrating this month</span>
              <Link to="/teams/membership/birthdays" className="text-xs text-primary hover:underline flex items-center">
                View <ChevronRight className="w-3 h-3 ml-0.5" />
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card hover:border-rose-500/40 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Anniversaries ({currentMonthName})
            </CardTitle>
            <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-500">
              <Heart className="w-5 h-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{loading ? '...' : anniversariesThisMonth.length}</div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-muted-foreground">Married couples celebrating</span>
              <Link to="/teams/membership/anniversaries" className="text-xs text-primary hover:underline flex items-center">
                View <ChevronRight className="w-3 h-3 ml-0.5" />
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card hover:border-emerald-500/40 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">New Members (30d)</CardTitle>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
              <UserPlus className="w-5 h-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{loading ? '...' : newMembersThisMonth.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Added in the past 30 days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Middle Section: Stage Pipeline & Celebration Quick Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stage Progression Funnel */}
        <Card className="glass-card lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Membership Funnel Distribution</CardTitle>
              <CardDescription>Member count by current stage in church growth process</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/teams/membership/journey">
                Kanban View <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {STAGES.map(stage => {
              const count = stageCounts[stage.key] || 0;
              const percentage = members.length > 0 ? Math.round((count / members.length) * 100) : 0;
              return (
                <div key={stage.key} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-foreground">{stage.label}</span>
                    <span className="text-muted-foreground">{count} member{count !== 1 ? 's' : ''} ({percentage}%)</span>
                  </div>
                  <Progress value={percentage} className="h-2" />
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Monthly Celebrations Summary */}
        <Card className="glass-card space-y-4">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              {currentMonthName} Highlights
            </CardTitle>
            <CardDescription>Members to reach out to this month</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Birthdays list */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Cake className="w-3.5 h-3.5 text-pink-500" /> Birthdays ({birthdaysThisMonth.length})
                </span>
                <Link to="/teams/membership/birthdays" className="text-xs text-primary hover:underline">See all</Link>
              </div>
              {birthdaysThisMonth.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2 italic">No birthdays logged for {currentMonthName}</p>
              ) : (
                <div className="space-y-2">
                  {birthdaysThisMonth.slice(0, 3).map(m => (
                    <div key={m.id} className="flex items-center justify-between p-2 rounded-lg bg-secondary/50 text-xs">
                      <span className="font-medium text-foreground">{m.firstName} {m.surname}</span>
                      <Badge variant="outline" className="text-pink-500 border-pink-500/30">
                        Day {m.dateOfBirthDay}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Anniversaries list */}
            <div className="pt-2 border-t border-border/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Heart className="w-3.5 h-3.5 text-rose-500" /> Anniversaries ({anniversariesThisMonth.length})
                </span>
                <Link to="/teams/membership/anniversaries" className="text-xs text-primary hover:underline">See all</Link>
              </div>
              {anniversariesThisMonth.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2 italic">No anniversaries logged for {currentMonthName}</p>
              ) : (
                <div className="space-y-2">
                  {anniversariesThisMonth.slice(0, 3).map(m => (
                    <div key={m.id} className="flex items-center justify-between p-2 rounded-lg bg-secondary/50 text-xs">
                      <span className="font-medium text-foreground">{m.firstName} {m.surname}</span>
                      <Badge variant="outline" className="text-rose-500 border-rose-500/30">
                        Day {m.weddingAnniversaryDay}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass-card p-4 hover:border-primary/50 transition-colors">
          <div className="flex items-start gap-3">
            <div className="p-3 rounded-xl bg-blue-500/10 text-blue-500">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Full CRM Directory</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Search, profile, edit member DOB, wedding anniversary, and sector details.</p>
              <Button asChild size="sm" variant="link" className="px-0 mt-2 text-primary">
                <Link to="/teams/membership/members">Open Directory &rarr;</Link>
              </Button>
            </div>
          </div>
        </Card>

        <Card className="glass-card p-4 hover:border-primary/50 transition-colors">
          <div className="flex items-start gap-3">
            <div className="p-3 rounded-xl bg-pink-500/10 text-pink-500">
              <Cake className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Celebration Reminders</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Filter birthdays & wedding anniversaries month-by-month for pastoral care.</p>
              <Button asChild size="sm" variant="link" className="px-0 mt-2 text-primary">
                <Link to="/teams/membership/birthdays">Open Birthday Tracker &rarr;</Link>
              </Button>
            </div>
          </div>
        </Card>

        <Card className="glass-card p-4 hover:border-primary/50 transition-colors">
          <div className="flex items-start gap-3">
            <div className="p-3 rounded-xl bg-purple-500/10 text-purple-500">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Member Journey Pipeline</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Track member growth from First Time Guest to Steward and Resident Pastor.</p>
              <Button asChild size="sm" variant="link" className="px-0 mt-2 text-primary">
                <Link to="/teams/membership/journey">View Member Pipeline &rarr;</Link>
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

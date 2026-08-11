
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  Trophy,
  Medal,
  Award,
  TrendingUp,
  Users,
  Heart,
  Calendar,
  Crown,
  Star,
  Flame,
  TrendingDown,
  Target,
  Minus
} from 'lucide-react';

const Leaderboard = () => {
  const { user } = useAuth();
  const [timeFilter, setTimeFilter] = useState('month');
  const [categoryFilter, setCategoryFilter] = useState('individual');

  // Mock data - in real app this would come from Supabase
  const individualLeaderboard = [
    {
      id: 1,
      name: "John Doe",
      avatar: "",
      role: "Team Leader",
      sector: "North Sector",
      team: "Alpha Team",
      soulsCount: 47,
      followUpsCompleted: 23,
      target: 50,
      rank: 1,
      previousRank: 3,
      badges: ["Top Performer", "Consistent"],
      streak: 12,
      percentage: 94
    },
    {
      id: 2,
      name: "Mary Wilson",
      avatar: "",
      role: "Member",
      sector: "West Sector",
      team: "Epsilon Team",
      soulsCount: 42,
      followUpsCompleted: 28,
      target: 45,
      rank: 2,
      previousRank: 1,
      badges: ["Follow-up Champion"],
      streak: 8,
      percentage: 93
    },
    {
      id: 3,
      name: "Sarah Johnson",
      avatar: "",
      role: "Member",
      sector: "South Sector",
      team: "Gamma Team",
      soulsCount: 38,
      followUpsCompleted: 19,
      target: 40,
      rank: 3,
      previousRank: 4,
      badges: ["Rising Star"],
      streak: 15,
      percentage: 95
    }
  ];

  const getRankIcon = (rank) => {
    switch (rank) {
      case 1:
        return <Crown className="h-4 w-4 md:h-5 md:w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-4 w-4 md:h-5 md:w-5 text-gray-400" />;
      case 3:
        return <Award className="h-4 w-4 md:h-5 md:w-5 text-amber-600" />;
      default:
        return <div className="w-4 h-4 md:w-5 md:h-5 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold">{rank}</div>;
    }
  };

  const getRankChange = (current, previous) => {
    if (current < previous) {
      return <TrendingUp className="h-3 w-3 md:h-4 md:w-4 text-green-500" />;
    } else if (current > previous) {
      return <TrendingDown className="h-3 w-3 md:h-4 md:w-4 text-red-500" />;
    }
    return <Minus className="h-3 w-3 md:h-4 md:w-4 text-gray-400" />;
  };

  const currentUserRank = individualLeaderboard.find(member => member.name === user?.name) || individualLeaderboard[0];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="sticky top-0 z-10 bg-white border-b px-4 py-3 md:hidden">
        <div className="flex justify-between items-center">
          <h1 className="text-lg font-semibold">Save the bear</h1>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" className="text-xs">
              <Trophy className="h-3 w-3 mr-1" />
              Event
            </Button>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Desktop Header */}
        <div className="hidden md:flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Leaderboard</h1>
            <p className="text-muted-foreground">Celebrate outreach achievements and progress</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={timeFilter === 'week' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeFilter('week')}
            >
              This Week
            </Button>
            <Button
              variant={timeFilter === 'month' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeFilter('month')}
            >
              This Month
            </Button>
            <Button
              variant={timeFilter === 'year' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeFilter('year')}
            >
              This Year
            </Button>
          </div>
        </div>

        {/* Mobile Event Video Card */}
        <div className="md:hidden">
          <Card className="bg-gradient-to-r from-blue-400 to-blue-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                    <Trophy className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold">Video</h3>
                  <p className="text-sm opacity-90">Event's video</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top 3 - Mobile Circular Layout */}
        <div className="md:hidden">
          <div className="flex justify-center items-end gap-4 mb-6">
            {/* 2nd Place */}
            <div className="text-center">
              <div className="relative">
                <Avatar className="h-16 w-16 border-4 border-gray-300">
                  <AvatarFallback className="text-lg">{individualLeaderboard[1]?.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-gray-400 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">2</span>
                </div>
              </div>
              <div className="mt-2">
                <div className="font-semibold text-sm">{individualLeaderboard[1]?.name}</div>
                <div className="text-xs text-gray-500">{individualLeaderboard[1]?.percentage}%</div>
              </div>
            </div>

            {/* 1st Place */}
            <div className="text-center">
              <div className="relative">
                <Avatar className="h-20 w-20 border-4 border-yellow-400">
                  <AvatarFallback className="text-xl">{individualLeaderboard[0]?.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="absolute -top-2 -right-2 w-7 h-7 bg-yellow-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">1</span>
                </div>
              </div>
              <div className="mt-2">
                <div className="font-semibold">{individualLeaderboard[0]?.name}</div>
                <div className="text-sm text-gray-500">{individualLeaderboard[0]?.percentage}%</div>
              </div>
            </div>

            {/* 3rd Place */}
            <div className="text-center">
              <div className="relative">
                <Avatar className="h-16 w-16 border-4 border-amber-400">
                  <AvatarFallback className="text-lg">{individualLeaderboard[2]?.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-amber-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">3</span>
                </div>
              </div>
              <div className="mt-2">
                <div className="font-semibold text-sm">{individualLeaderboard[2]?.name}</div>
                <div className="text-xs text-gray-500">{individualLeaderboard[2]?.percentage}%</div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Leaderboard List */}
        <div className="md:hidden space-y-2">
          {individualLeaderboard.slice(3).map((member, index) => (
            <Card key={member.id} className={`${member.name === user?.name ? 'bg-blue-50 border-blue-200' : ''}`}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold">{index + 4}</span>
                    </div>
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-sm">{member.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium text-sm">{member.name}</div>
                      <div className="text-xs text-muted-foreground">{member.role}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold">{member.percentage}%</div>
                    <div className="text-xs text-muted-foreground">{member.soulsCount} souls</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Desktop View */}
        <div className="hidden md:block">
          {/* Category Tabs */}
          <div className="flex gap-2 mb-6">
            <Button
              variant={categoryFilter === 'individual' ? 'default' : 'outline'}
              onClick={() => setCategoryFilter('individual')}
              className="flex items-center gap-2"
            >
              <Users className="h-4 w-4" />
              Individual
            </Button>
            <Button
              variant={categoryFilter === 'team' ? 'default' : 'outline'}
              onClick={() => setCategoryFilter('team')}
              className="flex items-center gap-2"
            >
              <Users className="h-4 w-4" />
              Teams
            </Button>
            <Button
              variant={categoryFilter === 'sector' ? 'default' : 'outline'}
              onClick={() => setCategoryFilter('sector')}
              className="flex items-center gap-2"
            >
              <Trophy className="h-4 w-4" />
              Sectors
            </Button>
          </div>

          {/* Current User Performance */}
          {categoryFilter === 'individual' && currentUserRank && (
            <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200 mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5 text-red-500" />
                  Your Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      {getRankIcon(currentUserRank.rank)}
                      <span className="text-2xl font-bold">#{currentUserRank.rank}</span>
                    </div>
                    <div>
                      <p className="font-medium">{currentUserRank.soulsCount} souls reached</p>
                      <p className="text-sm text-muted-foreground">
                        {currentUserRank.followUpsCompleted} follow-ups completed
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 mb-1">
                      <Calendar className="h-4 w-4" />
                      <span className="text-sm">{currentUserRank.streak} day streak</span>
                    </div>
                    <Progress
                      value={(currentUserRank.soulsCount / currentUserRank.target) * 100}
                      className="w-32"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {currentUserRank.soulsCount}/{currentUserRank.target} target
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Desktop Leaderboard */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                Individual Leaderboard
                <Badge variant="outline">{timeFilter}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {individualLeaderboard.map((member) => (
                  <AccordionItem key={member.id} value={`item-${member.id}`}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-4 w-full">
                        <div className="flex items-center gap-2">
                          {getRankIcon(member.rank)}
                          {getRankChange(member.rank, member.previousRank)}
                        </div>

                        <Avatar className="h-10 w-10">
                          <AvatarImage src={member.avatar} />
                          <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                        </Avatar>

                        <div className="flex-1 text-left">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium">{member.name}</h3>
                            {member.name === user?.name && (
                              <Badge variant="outline" className="text-xs">You</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {member.role} • {member.sector}
                          </p>
                        </div>

                        <div className="text-right">
                          <div className="flex items-center gap-2">
                            <Heart className="h-4 w-4 text-red-500" />
                            <span className="font-bold text-lg">{member.soulsCount}</span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {member.followUpsCompleted} follow-ups
                          </div>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="pt-4 pl-16">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="text-center p-3 bg-gray-50 rounded-lg">
                            <Flame className="h-5 w-5 mx-auto mb-1 text-orange-500" />
                            <div className="text-lg font-bold">{member.streak}</div>
                            <div className="text-xs text-muted-foreground">Day Streak</div>
                          </div>
                          <div className="text-center p-3 bg-gray-50 rounded-lg">
                            <Target className="h-5 w-5 mx-auto mb-1 text-blue-500" />
                            <div className="text-lg font-bold">{Math.round((member.soulsCount / member.target) * 100)}%</div>
                            <div className="text-xs text-muted-foreground">Target</div>
                          </div>
                          <div className="text-center p-3 bg-gray-50 rounded-lg">
                            <Users className="h-5 w-5 mx-auto mb-1 text-green-500" />
                            <div className="text-lg font-bold">{member.followUpsCompleted}</div>
                            <div className="text-xs text-muted-foreground">Follow-ups</div>
                          </div>
                          <div className="text-center p-3 bg-gray-50 rounded-lg">
                            <Star className="h-5 w-5 mx-auto mb-1 text-purple-500" />
                            <div className="text-lg font-bold">{member.badges.length}</div>
                            <div className="text-xs text-muted-foreground">Badges</div>
                          </div>
                        </div>
                        <div className="mt-4">
                          <div className="flex gap-2 flex-wrap">
                            {member.badges.map((badge, badgeIndex) => (
                              <Badge key={badgeIndex} variant="secondary" className="text-xs">
                                {badge}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;

import { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Heart,
  Users,
  TrendingUp,
  MapPin,
  Target,
  Clock,
  CheckCircle,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const Dashboard = () => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('day');

  // Mock data for charts
  const weeklyData = [
    { day: 'Sun', souls: 12, followUps: 8 },
    { day: 'Mon', souls: 19, followUps: 15 },
    { day: 'Tue', souls: 8, followUps: 12 },
    { day: 'Wed', souls: 15, followUps: 18 },
    { day: 'Thu', souls: 22, followUps: 16 },
    { day: 'Fri', souls: 18, followUps: 14 },
    { day: 'Sat', souls: 25, followUps: 20 }
  ];

  const deviceData = [
    { name: 'Mobile', value: 83.3, color: '#3b82f6' },
    { name: 'Desktop', value: 16.7, color: '#ef4444' }
  ];

  const statsCards = [
    {
      title: "Souls This Week",
      value: "119",
      change: "+12%",
      trend: "up",
      icon: Heart,
      color: "text-red-500"
    },
    {
      title: "Follow-ups",
      value: "103",
      change: "+8%",
      trend: "up",
      icon: Users,
      color: "text-blue-500"
    },
    {
      title: "Distance",
      value: "6.23km",
      change: "Average",
      trend: "neutral",
      icon: MapPin,
      color: "text-green-500"
    },
    {
      title: "Heart Points",
      value: "1,457",
      change: "+5%",
      trend: "up",
      icon: Heart,
      color: "text-purple-500"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="sticky top-0 z-10 bg-white border-b px-4 py-3 md:hidden">
        <div className="flex justify-between items-center">
          <h1 className="text-lg font-semibold">Dashboard</h1>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
            <TabsList className="grid w-full grid-cols-4 h-8 text-xs">
              <TabsTrigger value="day" className="px-2">DAY</TabsTrigger>
              <TabsTrigger value="week" className="px-2">WEEK</TabsTrigger>
              <TabsTrigger value="month" className="px-2">MONTH</TabsTrigger>
              <TabsTrigger value="year" className="px-2">YEAR</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Desktop Header */}
        <div className="hidden md:flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">Welcome back, {user?.first_name}!</p>
          </div>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="day">Day</TabsTrigger>
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="month">Month</TabsTrigger>
              <TabsTrigger value="year">Year</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Stats Cards - Mobile Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
          {statsCards.map((stat, index) => (
            <Card key={index} className="glass-card">
              <CardContent className="p-3 md:p-6">
                <div className="flex flex-col items-center text-center md:items-start md:text-left">
                  <div className="flex items-center gap-2 mb-2">
                    <stat.icon className={`h-4 w-4 md:h-5 md:w-5 ${stat.color}`} />
                    <span className="text-xs md:text-sm font-medium hidden md:inline">{stat.title}</span>
                  </div>
                  <div className="space-y-1">
                    <div className="text-lg md:text-2xl font-bold">{stat.value}</div>
                    <div className="text-xs md:text-sm text-muted-foreground md:hidden">{stat.title}</div>
                    <div className={`text-xs md:text-sm flex items-center gap-1 justify-center md:justify-start ${stat.trend === 'up' ? 'text-green-600' :
                      stat.trend === 'down' ? 'text-red-600' : 'text-gray-600'
                      }`}>
                      {stat.trend === 'up' && <TrendingUp className="h-3 w-3" />}
                      {stat.change}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* Activity Chart */}
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base md:text-lg flex items-center gap-2">
                <Activity className="h-4 w-4 md:h-5 md:w-5" />
                Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48 md:h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="souls" fill="#3b82f6" />
                    <Bar dataKey="followUps" fill="#ef4444" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Mobile Stats Below Chart */}
              <div className="grid grid-cols-2 gap-4 mt-4 md:hidden">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-blue-600 mx-auto mb-1" />
                  <div className="text-xl font-bold text-blue-600">56%</div>
                  <div className="text-xs text-blue-600">Progress</div>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <Clock className="h-5 w-5 text-purple-600 mx-auto mb-1" />
                  <div className="text-xl font-bold text-purple-600">6.23 km</div>
                  <div className="text-xs text-purple-600">Average Run</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sessions by Device */}
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base md:text-lg">Sessions by device</CardTitle>
              <p className="text-xs md:text-sm text-muted-foreground">Last 7 days</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Line Chart */}
                <div className="h-32 md:h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={weeklyData}>
                      <Line
                        type="monotone"
                        dataKey="souls"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="followUps"
                        stroke="#ef4444"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Device Stats */}
                <div className="grid grid-cols-2 gap-4">
                  {deviceData.map((device, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: device.color }}
                        />
                        <span className="text-sm font-medium">{device.name}</span>
                      </div>
                      <div className="text-sm font-bold">{device.value}%</div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Stats - Mobile Only */}
        <div className="grid grid-cols-2 gap-4 md:hidden">
          <Card className="glass-card">
            <CardContent className="p-4 text-center">
              <PieChart className="h-6 w-6 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-blue-600">76.3%</div>
              <div className="text-xs text-muted-foreground">Bounce Rate</div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4 text-center">
              <BarChart3 className="h-6 w-6 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-green-600">Traffic</div>
              <div className="text-xs text-muted-foreground">Weekly</div>
            </CardContent>
          </Card>
        </div>

        {/* Additional Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          <Card className="glass-card">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Monthly Target</p>
                  <div className="text-xl md:text-2xl font-bold">150</div>
                </div>
                <Target className="h-8 w-8 text-blue-500" />
              </div>
              <Progress value={68} className="mt-3" />
              <p className="text-xs text-muted-foreground mt-2">102 of 150 souls reached</p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending Follow-ups</p>
                  <div className="text-xl md:text-2xl font-bold">23</div>
                </div>
                <Clock className="h-8 w-8 text-orange-500" />
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Badge variant="outline" className="text-xs">High Priority: 8</Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completion Rate</p>
                  <div className="text-xl md:text-2xl font-bold">87%</div>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
              <div className="mt-3 text-xs text-green-600 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                +12% from last month
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Users, Table, Clock, Calendar, ArrowLeft } from 'lucide-react';

interface AnalyticsDashboardProps {
  onNavigate: (page: 'landing' | 'search' | 'staff' | 'analytics') => void;
}

const seatedVsWaitingData = [
  { name: 'Mon', seated: 45, waiting: 12 },
  { name: 'Tue', seated: 38, waiting: 8 },
  { name: 'Wed', seated: 52, waiting: 15 },
  { name: 'Thu', seated: 61, waiting: 22 },
  { name: 'Fri', seated: 78, waiting: 35 },
  { name: 'Sat', seated: 82, waiting: 28 },
  { name: 'Sun', seated: 71, waiting: 18 }
];

const capacityData = [
  { name: 'Occupied', value: 65, color: '#87CEEB' },
  { name: 'Available', value: 35, color: '#B0E0E6' }
];

const peakHoursData = [
  { time: '11 AM', male: 8, female: 7, all: 15 },
  { time: '12 PM', male: 15, female: 13, all: 28 },
  { time: '1 PM', male: 23, female: 19, all: 42 },
  { time: '2 PM', male: 21, female: 17, all: 38 },
  { time: '3 PM', male: 12, female: 10, all: 22 },
  { time: '4 PM', male: 10, female: 8, all: 18 },
  { time: '5 PM', male: 13, female: 11, all: 24 },
  { time: '6 PM', male: 25, female: 20, all: 45 },
  { time: '7 PM', male: 38, female: 30, all: 68 },
  { time: '8 PM', male: 40, female: 32, all: 72 },
  { time: '9 PM', male: 32, female: 26, all: 58 },
  { time: '10 PM', male: 19, female: 16, all: 35 }
];

export function AnalyticsDashboard({ onNavigate }: AnalyticsDashboardProps) {
  return (
    <div className="relative min-h-screen py-8 overflow-hidden" style={{background: 'linear-gradient(to bottom right, #BAF8FF, #ffffff)'}}>
      <div className="absolute inset-0 bg-white/30 pointer-events-none" />
      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <Button 
              variant="ghost" 
              onClick={() => onNavigate('staff')}
              className="mr-4 pill-button"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Analytics Dashboard</h1>
              <p className="text-gray-600 mt-1">Spice Route - Downtown Location</p>
            </div>
          </div>
          <Badge className="bg-blue-100 text-blue-800 px-4 py-2 rounded-full">
            Today: {new Date().toLocaleDateString()}
          </Badge>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="card-shadow border-0 rounded-2xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Today's Customers</p>
                  <p className="text-3xl font-bold text-gray-800">247</p>
                  <div className="flex items-center mt-2">
                    <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                    <span className="text-sm text-green-600">+12% vs yesterday</span>
                  </div>
                </div>
                <div className="bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-shadow border-0 rounded-2xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Avg Wait Time</p>
                  <p className="text-3xl font-bold text-gray-800">18m</p>
                  <div className="flex items-center mt-2">
                    <TrendingDown className="h-4 w-4 text-green-500 mr-1" />
                    <span className="text-sm text-green-600">-5m vs yesterday</span>
                  </div>
                </div>
                <div className="bg-orange-100 rounded-full w-12 h-12 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-shadow border-0 rounded-2xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Table Turnover</p>
                  <p className="text-3xl font-bold text-gray-800">3.2x</p>
                  <div className="flex items-center mt-2">
                    <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                    <span className="text-sm text-green-600">+0.3x vs yesterday</span>
                  </div>
                </div>
                <div className="bg-green-100 rounded-full w-12 h-12 flex items-center justify-center">
                  <Table className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-shadow border-0 rounded-2xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Peak Capacity</p>
                  <p className="text-3xl font-bold text-gray-800">85%</p>
                  <div className="flex items-center mt-2">
                    <TrendingUp className="h-4 w-4 text-blue-500 mr-1" />
                    <span className="text-sm text-blue-600">+8% vs yesterday</span>
                  </div>
                </div>
                <div className="bg-purple-100 rounded-full w-12 h-12 flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Grid */}
        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          {/* Seated vs Waiting Chart */}
          <Card className="card-shadow border-0 rounded-3xl">
            <CardHeader>
              <CardTitle className="text-xl text-gray-800">Weekly Overview: Seated vs Waiting</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={seatedVsWaitingData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f8ff" />
                  <XAxis dataKey="name" stroke="#64748b" />
                  <YAxis stroke="#64748b" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #87CEEB', 
                      borderRadius: '12px',
                      boxShadow: '0 8px 30px rgba(135, 206, 235, 0.15)'
                    }}
                  />
                  <Bar dataKey="seated" fill="#87CEEB" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="waiting" fill="#B0E0E6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Capacity Pie Chart */}
          <Card className="card-shadow border-0 rounded-3xl">
            <CardHeader>
              <CardTitle className="text-xl text-gray-800">Current Capacity Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={capacityData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}%`}
                    labelLine={false}
                  >
                    {capacityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #87CEEB', 
                      borderRadius: '12px',
                      boxShadow: '0 8px 30px rgba(135, 206, 235, 0.15)'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Peak Hours Chart */}
        <Card className="card-shadow border-0 rounded-3xl mb-8">
          <CardHeader>
            <CardTitle className="text-xl text-gray-800">Today's Peak Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={peakHoursData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f8ff" />
                <XAxis dataKey="time" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #87CEEB', 
                    borderRadius: '12px',
                    boxShadow: '0 8px 30px rgba(135, 206, 235, 0.15)'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="male" 
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  name="Male"
                  dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, fill: '#ffffff', stroke: '#3B82F6', strokeWidth: 2 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="female" 
                  stroke="#EF4444" 
                  strokeWidth={2}
                  name="Female"
                  dot={{ fill: '#EF4444', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, fill: '#ffffff', stroke: '#EF4444', strokeWidth: 2 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="all" 
                  stroke="#000000" 
                  strokeWidth={3}
                  name="All"
                  dot={{ fill: '#000000', strokeWidth: 2, r: 5 }}
                  activeDot={{ r: 7, fill: '#ffffff', stroke: '#000000', strokeWidth: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="card-shadow border-0 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100">
            <CardContent className="p-6 text-center">
              <h3 className="text-lg font-semibold text-blue-800 mb-2">Peak Hour</h3>
              <p className="text-3xl font-bold text-blue-900 mb-1">8:00 PM</p>
              <p className="text-sm text-blue-700">72 customers served</p>
            </CardContent>
          </Card>

          <Card className="card-shadow border-0 rounded-2xl bg-gradient-to-br from-green-50 to-green-100">
            <CardContent className="p-6 text-center">
              <h3 className="text-lg font-semibold text-green-800 mb-2">Busiest Day</h3>
              <p className="text-3xl font-bold text-green-900 mb-1">Saturday</p>
              <p className="text-sm text-green-700">82 customers average</p>
            </CardContent>
          </Card>

          <Card className="card-shadow border-0 rounded-2xl bg-gradient-to-br from-purple-50 to-purple-100">
            <CardContent className="p-6 text-center">
              <h3 className="text-lg font-semibold text-purple-800 mb-2">Efficiency Score</h3>
              <p className="text-3xl font-bold text-purple-900 mb-1">94%</p>
              <p className="text-sm text-purple-700">Above industry average</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
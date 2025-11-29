import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Users, Table, Clock, Calendar, ArrowLeft } from 'lucide-react';
import { formatGSTDate } from '../utils/dateFormat';

interface AnalyticsDashboardProps {
  onNavigate: (page: 'landing' | 'search' | 'staff' | 'analytics') => void;
}

export function AnalyticsDashboard({ onNavigate }: AnalyticsDashboardProps) {
  // Initialize with empty arrays - data should come from API
  const [seatedVsWaitingData] = useState<{ name: string; seated: number; waiting: number }[]>([]);
  const [capacityData] = useState<{ name: string; value: number; color: string }[]>([]);
  const [peakHoursData] = useState<{ time: string; all: number }[]>([]);
  
  // KPI values - should come from API
  const todaysCustomers = 0;
  const avgWaitTime = 0;
  const tableTurnover = 0;
  const peakCapacity = 0;
  
  // Summary card values - should come from API
  const peakHour = '—';
  const busiestDay = '—';
  const efficiencyScore = 0;
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
            </div>
          </div>
          <Badge className="bg-blue-100 text-blue-800 px-4 py-2 rounded-full">
            Today: {formatGSTDate(new Date())}
          </Badge>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="card-shadow border-0 rounded-2xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Today's Customers</p>
                  <p className="text-3xl font-bold text-gray-800">{todaysCustomers}</p>
                  <div className="flex items-center mt-2">
                    <span className="text-sm text-gray-500">No data available</span>
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
                  <p className="text-3xl font-bold text-gray-800">{avgWaitTime > 0 ? `${avgWaitTime}m` : '—'}</p>
                  <div className="flex items-center mt-2">
                    <span className="text-sm text-gray-500">No data available</span>
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
                  <p className="text-3xl font-bold text-gray-800">{tableTurnover > 0 ? `${tableTurnover}x` : '—'}</p>
                  <div className="flex items-center mt-2">
                    <span className="text-sm text-gray-500">No data available</span>
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
                  <p className="text-3xl font-bold text-gray-800">{peakCapacity > 0 ? `${peakCapacity}%` : '—'}</p>
                  <div className="flex items-center mt-2">
                    <span className="text-sm text-gray-500">No data available</span>
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
              {seatedVsWaitingData.length > 0 ? (
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
              ) : (
                <div className="flex items-center justify-center h-[300px] text-gray-500">
                  <p>No data available</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Capacity Pie Chart */}
          <Card className="card-shadow border-0 rounded-3xl">
            <CardHeader>
              <CardTitle className="text-xl text-gray-800">Current Capacity Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              {capacityData.length > 0 ? (
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
              ) : (
                <div className="flex items-center justify-center h-[300px] text-gray-500">
                  <p>No data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Peak Hours Chart */}
        <Card className="card-shadow border-0 rounded-3xl mb-8">
          <CardHeader>
            <CardTitle className="text-xl text-gray-800">Today's Peak Hours</CardTitle>
          </CardHeader>
          <CardContent>
            {peakHoursData.length > 0 ? (
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
                    dataKey="all" 
                    stroke="#000000" 
                    strokeWidth={3}
                    name="All"
                    dot={{ fill: '#000000', strokeWidth: 2, r: 5 }}
                    activeDot={{ r: 7, fill: '#ffffff', stroke: '#000000', strokeWidth: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-gray-500">
                <p>No data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="card-shadow border-0 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100">
            <CardContent className="p-6 text-center">
              <h3 className="text-lg font-semibold text-blue-800 mb-2">Peak Hour</h3>
              <p className="text-3xl font-bold text-blue-900 mb-1">{peakHour}</p>
              <p className="text-sm text-blue-700">No data available</p>
            </CardContent>
          </Card>

          <Card className="card-shadow border-0 rounded-2xl bg-gradient-to-br from-green-50 to-green-100">
            <CardContent className="p-6 text-center">
              <h3 className="text-lg font-semibold text-green-800 mb-2">Busiest Day</h3>
              <p className="text-3xl font-bold text-green-900 mb-1">{busiestDay}</p>
              <p className="text-sm text-green-700">No data available</p>
            </CardContent>
          </Card>

          <Card className="card-shadow border-0 rounded-2xl bg-gradient-to-br from-purple-50 to-purple-100">
            <CardContent className="p-6 text-center">
              <h3 className="text-lg font-semibold text-purple-800 mb-2">Efficiency Score</h3>
              <p className="text-3xl font-bold text-purple-900 mb-1">{efficiencyScore > 0 ? `${efficiencyScore}%` : '—'}</p>
              <p className="text-sm text-purple-700">No data available</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
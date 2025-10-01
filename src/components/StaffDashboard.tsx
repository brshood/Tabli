import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Users, Table, Clock, CheckCircle, Phone, X, User, BarChart3, Calendar, FileText } from 'lucide-react';

interface StaffDashboardProps {
  onNavigate: (page: 'landing' | 'search' | 'staff' | 'analytics') => void;
}

const mockWaitlist = [
  { id: 1, name: "Sarah Johnson", partySize: 4, waitTime: "15 min", phone: "(555) 123-4567", joined: "7:30 PM" },
  { id: 2, name: "Mike Chen", partySize: 2, waitTime: "25 min", phone: "(555) 234-5678", joined: "7:45 PM" },
  { id: 3, name: "Emily Rodriguez", partySize: 6, waitTime: "35 min", phone: "(555) 345-6789", joined: "8:00 PM" },
  { id: 4, name: "David Kim", partySize: 3, waitTime: "40 min", phone: "(555) 456-7890", joined: "8:15 PM" },
  { id: 5, name: "Lisa Park", partySize: 2, waitTime: "45 min", phone: "(555) 567-8901", joined: "8:30 PM" }
];

const mockSeatedTables = [
  { id: 1, table: "Table 5", guests: "John & Maria Martinez", partySize: 2, seatedTime: "7:15 PM", duration: "45 min" },
  { id: 2, table: "Table 12", guests: "The Wilson Family", partySize: 4, seatedTime: "6:30 PM", duration: "1h 30m" },
  { id: 3, table: "Table 8", guests: "Alex Thompson", partySize: 1, seatedTime: "7:45 PM", duration: "15 min" },
  { id: 4, table: "Table 3", guests: "Jennifer & Tom Davis", partySize: 2, seatedTime: "7:00 PM", duration: "1h" },
  { id: 5, table: "Table 15", guests: "Corporate Party", partySize: 8, seatedTime: "6:00 PM", duration: "2h" }
];

export function StaffDashboard({ onNavigate }: StaffDashboardProps) {
  const [waitlist, setWaitlist] = useState(mockWaitlist);
  const [seatedTables, setSeatedTables] = useState(mockSeatedTables);

  const removeFromWaitlist = (id: number) => {
    setWaitlist(prev => prev.filter(item => item.id !== id));
  };

  const seatCustomer = (id: number) => {
    const customer = waitlist.find(item => item.id === id);
    if (customer) {
      // Add to seated tables (simplified for demo)
      removeFromWaitlist(id);
      // In real app, would show table selection dialog
    }
  };

  const checkOutTable = (id: number) => {
    setSeatedTables(prev => prev.filter(table => table.id !== id));
  };

  return (
    <div className="relative min-h-screen py-8 overflow-hidden" style={{background: 'linear-gradient(to bottom right, #BAF8FF, #ffffff)'}}>
      <div className="absolute inset-0 bg-white/30 pointer-events-none" />
      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Spice Route – Staff Dashboard</h1>
            <div className="flex items-center mt-2">
              <Badge className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
                Downtown Location
              </Badge>
            </div>
          </div>
          <Button 
            onClick={() => onNavigate('analytics')}
            className="pill-button"
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            View Analytics
          </Button>
        </div>

        {/* KPI Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="card-shadow border-0 rounded-2xl">
            <CardContent className="p-6 text-center">
              <div className="bg-orange-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Clock className="h-8 w-8 text-orange-600" />
              </div>
              <div className="text-3xl font-bold text-gray-800 mb-1">{waitlist.length}</div>
              <div className="text-gray-600">People Waiting</div>
            </CardContent>
          </Card>

          <Card className="card-shadow border-0 rounded-2xl">
            <CardContent className="p-6 text-center">
              <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-green-600" />
              </div>
              <div className="text-3xl font-bold text-gray-800 mb-1">{seatedTables.length}</div>
              <div className="text-gray-600">Tables Seated</div>
            </CardContent>
          </Card>

          <Card className="card-shadow border-0 rounded-2xl">
            <CardContent className="p-6 text-center">
              <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Table className="h-8 w-8 text-blue-600" />
              </div>
              <div className="text-3xl font-bold text-gray-800 mb-1">20</div>
              <div className="text-gray-600">Total Tables</div>
            </CardContent>
          </Card>

          <Card className="card-shadow border-0 rounded-2xl">
            <CardContent className="p-6 text-center">
              <div className="bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-purple-600" />
              </div>
              <div className="text-3xl font-bold text-gray-800 mb-1">{20 - seatedTables.length}</div>
              <div className="text-gray-600">Available Tables</div>
            </CardContent>
          </Card>
        </div>

        {/* Two Column Layout */}
        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          {/* Waitlist */}
          <Card className="card-shadow border-0 rounded-3xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl text-gray-800 flex items-center">
                <Clock className="h-6 w-6 mr-2 text-orange-600" />
                Waitlist ({waitlist.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {waitlist.map((customer) => (
                  <div key={customer.id} className="bg-orange-50 rounded-2xl p-4 border border-orange-100">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center">
                        <div className="bg-orange-200 rounded-full w-10 h-10 flex items-center justify-center mr-3">
                          <User className="h-5 w-5 text-orange-700" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-800">{customer.name}</h4>
                          <p className="text-sm text-gray-600">Party of {customer.partySize} • Joined {customer.joined}</p>
                        </div>
                      </div>
                      <Badge className="bg-orange-200 text-orange-800 px-2 py-1 rounded-full text-xs">
                        {customer.waitTime}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-sm text-gray-600">
                        <Phone className="h-4 w-4 mr-1" />
                        {customer.phone}
                      </div>
                      
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          onClick={() => seatCustomer(customer.id)}
                          className="pill-button bg-green-500 hover:bg-green-600 text-xs"
                        >
                          Seat Now
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => removeFromWaitlist(customer.id)}
                          className="pill-button text-xs"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                
                {waitlist.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No customers in waitlist</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Currently Seated */}
          <Card className="card-shadow border-0 rounded-3xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl text-gray-800 flex items-center">
                <Table className="h-6 w-6 mr-2 text-green-600" />
                Currently Seated ({seatedTables.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {seatedTables.map((table) => (
                  <div key={table.id} className="bg-green-50 rounded-2xl p-4 border border-green-100">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center">
                        <div className="bg-green-200 rounded-full w-10 h-10 flex items-center justify-center mr-3">
                          <Table className="h-5 w-5 text-green-700" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-800">{table.table}</h4>
                          <p className="text-sm text-gray-600">{table.guests} • Party of {table.partySize}</p>
                        </div>
                      </div>
                      <Badge className="bg-green-200 text-green-800 px-2 py-1 rounded-full text-xs">
                        {table.duration}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-600">
                        Seated at {table.seatedTime}
                      </div>
                      
                      <Button 
                        size="sm" 
                        onClick={() => checkOutTable(table.id)}
                        className="pill-button bg-blue-500 hover:bg-blue-600 text-xs"
                      >
                        Check Out
                      </Button>
                    </div>
                  </div>
                ))}
                
                {seatedTables.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Table className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No tables currently occupied</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="card-shadow border-0 rounded-3xl">
          <CardHeader>
            <CardTitle className="text-xl text-gray-800">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <div className="flex flex-wrap gap-4">
              <Button className="pill-button bg-blue-500 hover:bg-blue-600">
                <Users className="h-4 w-4 mr-2" />
                Call Next in Waitlist
              </Button>
              <Button className="pill-button bg-purple-500 hover:bg-purple-600">
                <Table className="h-4 w-4 mr-2" />
                View Table Layout
              </Button>
              <Button className="pill-button bg-green-500 hover:bg-green-600">
                <FileText className="h-4 w-4 mr-2" />
                Daily Summary
              </Button>
              <Button 
                className="pill-button bg-orange-500 hover:bg-orange-600"
                onClick={() => onNavigate('analytics')}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Analytics Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}